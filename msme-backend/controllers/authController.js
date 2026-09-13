const crypto = require('crypto')
const nodemailer = require('nodemailer')
const User = require('../models/User')
const {
  REFRESH_COOKIE,
  hash,
  verifyRefreshToken,
  issueTokens,
  clearAuthCookies,
  revokeAllTokens,
} = require('../utils/tokens')

// Issues the access + refresh pair as httpOnly cookies. No token is ever put
// in the response body or in a URL.
const sendAuth = async (user, statusCode, res) => {
  await issueTokens(user, res)
  user.password = undefined
  user.refreshTokenHash = undefined
  res.status(statusCode).json({ success: true, user })
}

exports.register = async (req, res) => {
  try {
    const { name, password } = req.body
    const email = req.body.email?.toLowerCase().trim()
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' })
    const user = await User.create({ name, email, password })
    await sendAuth(user, 201, res)
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors)
        .map((v) => v.message)
        .join(', ')
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
    await sendAuth(user, 200, res)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.googleCallback = async (req, res) => {
  try {
    // req.user comes from the passport strategy, which has already done the
    // googleId -> verified-email -> create resolution. Role is never taken
    // from Google.
    await issueTokens(req.user, res)

    // Redirect carries NO token. The session lives entirely in the cookies
    // set above, so nothing sensitive ends up in browser history, the
    // Referer header, or server logs.
    res.redirect(`${process.env.CLIENT_URL}/buyer`)
  } catch (err) {
    console.error('❌ Google callback error:', err.message)
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`)
  }
}

exports.getMe = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.status(200).json({
      success: true,
      user,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const { businessName } = req.body

    // Check if business name is already taken by another user
    if (businessName) {
      const existing = await User.findOne({
        businessName: { $regex: new RegExp(`^${businessName}$`, 'i') },
        _id: { $ne: req.user.id },
      })
      if (existing) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'This business name is already registered by another seller.',
          })
      }
    }

    const updateData = {}
    // NOTE: `role` is deliberately absent. A user must never set their own role.
    // Becoming a seller goes through POST /api/auth/become-seller.
    const allowedFields = [
      'businessName',
      'name',
      'panCardName',
      'avatar',
      'state',
      'district',
      'isProfileComplete',
    ]

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    })

    // If any of the core business details are provided, mark profile as complete
    if (updateData.businessName || updateData.state || updateData.district) {
      updateData.isProfileComplete = true
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

    const missing = ['businessName', 'panCardName', 'state', 'district'].filter(
      (f) => !req.body[f] || !String(req.body[f]).trim()
    )

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`,
      })
    }

    const existing = await User.findOne({
      businessName: { $regex: new RegExp(`^${businessName.trim()}$`, 'i') },
      _id: { $ne: req.user.id },
    })
    if (existing) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'This business name is already registered by another seller.',
        })
    }

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    if (user.role === 'admin') {
      return res
        .status(400)
        .json({ success: false, message: 'An admin account cannot be converted to a seller.' })
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
      const message = Object.values(err.errors)
        .map((v) => v.message)
        .join(', ')
      return res.status(400).json({ success: false, message })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.logout = async (req, res) => {
  try {
    if (req.user?.id) {
      const user = await User.findById(req.user.id).select('+refreshTokenHash +refreshTokenExpire')
      if (user) {
        user.refreshTokenHash = undefined
        user.refreshTokenExpire = undefined
        await user.save({ validateBeforeSave: false })
      }
    }
  } catch (err) {
    console.error('❌ Logout cleanup failed:', err.message)
  }
  clearAuthCookies(res)
  res.json({ success: true, message: 'Logged out successfully' })
}

// @desc    Rotate the refresh token and mint a new access token
// @route   POST /api/auth/refresh
// @access  Public (authenticated by the refresh cookie itself)
exports.refresh = async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE]
  if (!presented) {
    return res.status(401).json({ success: false, message: 'No refresh token' })
  }

  let payload
  try {
    payload = verifyRefreshToken(presented)
  } catch (_err) {
    clearAuthCookies(res)
    return res.status(401).json({ success: false, message: 'Invalid refresh token' })
  }

  const user = await User.findById(payload.id).select('+refreshTokenHash +refreshTokenExpire')
  if (!user) {
    clearAuthCookies(res)
    return res.status(401).json({ success: false, message: 'Invalid refresh token' })
  }

  // No stored hash means the family was already revoked (or the user logged out).
  if (!user.refreshTokenHash) {
    clearAuthCookies(res)
    return res.status(401).json({ success: false, message: 'Refresh token revoked' })
  }

  // The token is validly signed but is NOT the current one: an old token has
  // been replayed. Assume theft and revoke the entire family, which also
  // invalidates every outstanding access token via tokenVersion.
  if (hash(presented) !== user.refreshTokenHash) {
    await revokeAllTokens(user)
    clearAuthCookies(res)
    return res.status(401).json({
      success: false,
      message: 'Refresh token reuse detected. All sessions have been revoked.',
      code: 'token_reuse',
    })
  }

  if (user.refreshTokenExpire && user.refreshTokenExpire.getTime() < Date.now()) {
    await revokeAllTokens(user)
    clearAuthCookies(res)
    return res.status(401).json({ success: false, message: 'Refresh token expired' })
  }

  // Rotate: the presented token is now spent.
  await issueTokens(user, res)
  user.password = undefined
  user.refreshTokenHash = undefined
  return res.json({ success: true, user })
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
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        })

        await transporter.sendMail({
          from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
          to: user.email,
          subject: 'Password Reset Request',
          text: message,
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
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password')

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' })

    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    await sendAuth(user, 200, res)
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors)
        .map((v) => v.message)
        .join(', ')
      return res.status(400).json({ success: false, message })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}
