const jwt = require('jsonwebtoken')
const User = require('../models/User')

exports.verifyToken = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.token
    const headerToken = req.headers.authorization?.split(' ')[1]
    const token = cookieToken || headerToken

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (_error) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    // The JWT payload carries only { id }. Role and identity are read from the
    // database on every request, so a deleted or demoted user loses access
    // immediately instead of keeping it until the token expires.
    const user = await User.findById(decoded.id).select('_id name email role')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
    return next()
  } catch (globalErr) {
    console.error('❌ Auth error:', globalErr.message)
    return res.status(401).json({ success: false, message: 'Not authorized' })
  }
}

// Attaches req.user when a valid token is present, but never rejects.
// Used by endpoints that personalise for signed-in users yet must still
// work anonymously.
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]
    if (!token) return next()

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('_id name email role')
    if (user) {
      req.user = {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }
  } catch {
    // An invalid or expired token is simply treated as anonymous.
  }
  return next()
}
