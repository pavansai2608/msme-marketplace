const passport      = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User          = require('../models/User')
require('dotenv').config()

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env

// Treat blank strings as missing: a key left empty in .env is not configured.
const isSet = (v) => typeof v === 'string' && v.trim() !== ''

const isGoogleConfigured =
  isSet(GOOGLE_CLIENT_ID) && isSet(GOOGLE_CLIENT_SECRET) && isSet(GOOGLE_CALLBACK_URL)

if (isGoogleConfigured) {
  passport.use(new GoogleStrategy({
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL:  GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({
        $or: [{ googleId: profile.id }, { email: profile.emails[0].value }]
      })

      const googleData = {
        name:     profile.displayName,
        googleId: profile.id,
        avatar:   profile.photos[0]?.value,
        isVerified: true
      }

      if (!user) {
        user = await User.create({
          ...googleData,
          email: profile.emails[0].value
        })
      } else {
        // Always sync Google name and avatar to profile on login
        user.googleId = googleData.googleId
        user.name     = googleData.name
        user.avatar   = googleData.avatar
        user.isVerified = true
        await user.save()
      }

      return done(null, user)
    } catch (err) {
      return done(err, null)
    }
  }))
} else {
  console.warn('Google OAuth disabled - env vars not set')
}

module.exports = { isGoogleConfigured }
