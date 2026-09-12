const jwt  = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const User = require('../models/User')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' })

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id)
  res.cookie('token', token, {
    httpOnly: true,
    secure:   false, // Always false for local development
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  })
  user.password = undefined
  res.status(statusCode).json({ success: true, token, user })
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
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    user.lastLogin = new Date()
    await user.save()
    sendToken(user, 200, res)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.googleCallback = (req, res) => {
  const token = signToken(req.user)
  // Set the secure auth token
  res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7*24*60*60*1000 })
  // Set a readable name cookie for instant UI rendering
  res.cookie('display_name', req.user.name.split(' ')[0], { httpOnly: false, secure: false, sameSite: 'lax', maxAge: 7*24*60*60*1000 })
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
    console.log('📡 [AUTH] updateProfile request:', req.body);
    const { businessName, name, panCardName, role, avatar, state, district } = req.body
    
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
    const allowedFields = ['businessName', 'name', 'panCardName', 'role', 'avatar', 'state', 'district', 'isProfileComplete'];
    
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
    res.json({ success: true, user, token: signToken(user._id) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.logout = (req, res) => {
  res.cookie('token', '', { maxAge: 0 })
  res.json({ success: true, message: 'Logged out successfully' })
}

exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim()
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const resetToken = crypto.randomBytes(20).toString('hex')
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000 // 10 minutes

    await user.save()

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`

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

      res.status(200).json({ success: true, message: 'Email sent successfully' })
    } catch (err) {
      console.error('❌ Nodemailer Error:', err)
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined
      await user.save()
      return res.status(500).json({ success: false, message: 'Email could not be sent. Check backend terminal for details.' })
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' })

    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    sendToken(user, 200, res)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
