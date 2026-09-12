const jwt  = require('jsonwebtoken')
const User = require('../models/User')

exports.verifyToken = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.token;
    const headerToken = req.headers.authorization?.split(' ')[1];
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // The JWT payload carries only { id }. Role and identity are read from the
    // database on every request, so a deleted or demoted user loses access
    // immediately instead of keeping it until the token expires.
    const user = await User.findById(decoded.id).select('_id name email role')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    req.user = {
      id:    user._id.toString(),
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    }
    return next();
  } catch (globalErr) {
    console.error('❌ Auth error:', globalErr.message);
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
}
