const User = require('../models/User')

// Gates a route on the caller's role. Must run after verifyToken.
// The role is re-read from the database rather than trusted from the token
// or from anything the client sent.
exports.requireRole = (...roles) => async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    const user = await User.findById(req.user.id).select('role')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires role ${roles.join(' or ')}`
      })
    }

    req.user.role = user.role
    return next()
  } catch (err) {
    console.error('❌ Role check error:', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}
