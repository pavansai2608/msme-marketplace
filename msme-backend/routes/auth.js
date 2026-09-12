const express  = require('express')
const passport = require('passport')
const router   = express.Router()
const { register, login, googleCallback, getMe, logout, forgotPassword, resetPassword, updateProfile, becomeSeller } = require('../controllers/authController')
const { verifyToken } = require('../middleware/authMiddleware')
const { rateLimiter } = require('../middleware/rateLimiter')

router.get('/ping', (req, res) => res.json({ msg: 'auth api online' }))

router.post('/register', rateLimiter, register)
router.post('/login',    rateLimiter, login)
router.get('/me',         verifyToken, getMe)
router.put('/update-profile', verifyToken, updateProfile)
router.post('/become-seller', verifyToken, becomeSeller)
router.post('/logout',    verifyToken, logout)
router.post('/forgot-password', rateLimiter, forgotPassword)
router.post('/reset-password/:token', rateLimiter, resetPassword)
router.get('/google',     passport.authenticate('google', { scope: ['profile','email'], session: false }))
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed` }),
  googleCallback
)

module.exports = router
