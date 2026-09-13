const express = require('express')
const passport = require('passport')
const router = express.Router()
const {
  register,
  login,
  googleCallback,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  updateProfile,
  becomeSeller,
  refresh,
} = require('../controllers/authController')
const { verifyToken } = require('../middleware/authMiddleware')
const { rateLimiter } = require('../middleware/rateLimiter')
const { isGoogleConfigured } = require('../config/passport')

// Google routes are always mounted so the API shape stays stable, but they
// refuse with 503 when the strategy was never registered. Without this the
// request would reach passport and throw "Unknown authentication strategy".
const requireGoogleConfigured = (req, res, next) => {
  if (isGoogleConfigured) return next()
  return res.status(503).json({
    success: false,
    message:
      'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL to enable it.',
  })
}

router.get('/ping', (req, res) => res.json({ msg: 'auth api online' }))

router.post('/register', rateLimiter, register)
router.post('/login', rateLimiter, login)
router.get('/me', verifyToken, getMe)
router.put('/update-profile', verifyToken, updateProfile)
router.post('/become-seller', verifyToken, becomeSeller)
router.post('/logout', verifyToken, logout)
// Authenticated by the refresh cookie itself, so no verifyToken here: the
// access token is expected to be expired when this is called.
router.post('/refresh', rateLimiter, refresh)
router.post('/forgot-password', rateLimiter, forgotPassword)
router.post('/reset-password/:token', rateLimiter, resetPassword)

router.get('/google', requireGoogleConfigured, (req, res, next) =>
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next)
)

router.get(
  '/google/callback',
  requireGoogleConfigured,
  (req, res, next) =>
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
    })(req, res, next),
  googleCallback
)

module.exports = router
