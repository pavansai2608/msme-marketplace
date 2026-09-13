const User = require('../models/User')
const { verifyAccessToken } = require('../utils/tokens')

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
      decoded = verifyAccessToken(token)
    } catch (_error) {
      // Expired or malformed. 'token_expired' tells the client it is worth
      // calling /api/auth/refresh instead of bouncing straight to /login.
      return res
        .status(401)
        .json({ success: false, message: 'Invalid token', code: 'token_expired' })
    }

    // Role and identity are read from the database on every request, so a
    // deleted or demoted user loses access immediately.
    const user = await User.findById(decoded.id).select('_id name email role tokenVersion')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    // Token family revoked since this access token was minted.
    if ((decoded.v || 0) !== (user.tokenVersion || 0)) {
      return res
        .status(401)
        .json({ success: false, message: 'Token revoked', code: 'token_revoked' })
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

    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.id).select('_id name email role tokenVersion')
    if (user && (decoded.v || 0) === (user.tokenVersion || 0)) {
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
