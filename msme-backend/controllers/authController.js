const jwt  = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const User = require('../models/User')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' })

const cookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
})

// Sets the auth cookie. The JWT is deliberately NOT returned in the body:
// the httpOnly cookie is the only place the token lives.
const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id)
  res.cookie('token', token, cookieOptions())
  user.password = undefined
  res.status(statusCode).json({ success: true, user })
}

exports.register = async (req, res) => {
  try {
    const { name, password } = req.body
    const email = req.body.email?.toLowerCase().trim()
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' })
    const user = await User.create({ name, email, password })
    sendToken(user, 201, res)
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(v => v.message).join(', ')
      return res.status(400).json({ success: false, message })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { password } = req.body
    const email = req.body.email?.toLowerCase().trim()
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    const user = await User.findOne({ email }).select('+password')
    if (!user || !user.password || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    user.lastLogin = new Date()
    await user.save()
    sendToken(user, 200, res)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.googleCallback = (req, res) => {
  const token = signToken(req.user._id)
  // Set the secure auth token
  res.cookie('token', token, cookieOptions())
  // Set a readable name cookie for instant UI rendering
  res.cookie('display_name', req.user.name.split(' ')[0], { ...cookieOptions(), httpOnly: false })
  res.redirect(`${process.env.CLIENT_URL}/buyer`)
}

exports.getMe = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      user
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const { businessName } = req.body

    // Check if business name is already taken by another user
    if (businessName) {
      const existing = await User.findOne({
        businessName: { $regex: new RegExp(`^${businessName}$`, 'i') },
        _id: { $ne: req.user.id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This business name is already registered by another seller.' });
      }
    }

    const updateData = {};
    // NOTE: `role` is deliberately absent. A user must never set their own role.
    // Becoming a seller goes through POST /api/auth/become-seller.
    const allowedFields = ['businessName', 'name', 'panCardName', 'avatar', 'state', 'district', 'isProfileComplete'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // If any of the core business details are provided, mark profile as complete
    if (updateData.businessName || updateData.state || updateData.district) {
      updateData.isProfileComplete = true;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Promote the current user to seller
// @route   POST /api/auth/become-seller
// @access  Private
// Can only ever set role to 'seller'. The role value is hardcoded, never read
// from the request body, so 'admin' is unreachable through this route.
exports.becomeSeller = async (req, res) => {
  try {
    const { businessName, panCardName, state, district } = req.body

    const missing = ['businessName', 'panCardName', 'state', 'district']
      .filter(f => !req.body[f] || !String(req.body[f]).trim())

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`
      })
    }

    const existing = await User.findOne({
      businessName: { $regex: new RegExp(`^${businessName.trim()}$`, 'i') },
      _id: { $ne: req.user.id }
    })
    if (existing) {
      return res.status(400).json({ success: false, message: 'This business name is already registered by another seller.' })
    }

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'An admin account cannot be converted to a seller.' })
    }

    user.role = 'seller'
    user.businessName = businessName.trim()
    user.panCardName = panCardName.trim()
    user.state = state.trim()
    user.district = district.trim()
    user.isProfileComplete = true
    await user.save()

    res.status(200).json({ success: true, user })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(v => v.message).join(', ')
      return res.status(400).json({ success: false, message })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.logout = (req, res) => {
  res.cookie('token', '', { ...cookieOptions(), maxAge: 0 })
  res.json({ success: true, message: 'Logged out successfully' })
}

// Always responds 200 with an identical message whether or not the email
// exists, so the endpoint cannot be used to enumerate registered users.
const RESET_GENERIC_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.'

exports.forgotPassword = async (req, res) => {
  const email = req.body.email?.toLowerCase().trim()

  try {
    const user = email ? await User.findOne({ email }) : null

    if (user) {
      const resetToken = crypto.randomBytes(20).toString('hex')
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
      user.resetPasswordExpire = Date.now() + 10 * 60 * 1000 // 10 minutes

      await user.save()

      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`
      const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please visit: \n\n ${resetUrl}`

      try {
        const transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        })

        await transporter.sendMail({
          from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
          to: user.email,
          subject: 'Password Reset Request',
          text: message
        })
      } catch (mailErr) {
        // Log for the operator, but never surface the failure to the caller:
        // a different response here would reveal that the account exists.
        console.error('❌ Nodemailer Error:', mailErr)
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined
        await user.save()
      }
    }

    return res.status(200).json({ success: true, message: RESET_GENERIC_MESSAGE })
  } catch (err) {
    console.error('❌ forgotPassword Error:', err)
    return res.status(200).json({ success: true, message: RESET_GENERIC_MESSAGE })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password')

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' })

    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    sendToken(user, 200, res)
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(v => v.message).join(', ')
      return res.status(400).json({ success: false, message })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}
