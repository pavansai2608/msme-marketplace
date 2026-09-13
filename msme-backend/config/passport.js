const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/User')
require('dotenv').config()

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env

// Treat blank strings as missing: a key left empty in .env is not configured.
const isSet = (v) => typeof v === 'string' && v.trim() !== ''

const isGoogleConfigured =
  isSet(GOOGLE_CLIENT_ID) && isSet(GOOGLE_CLIENT_SECRET) && isSet(GOOGLE_CALLBACK_URL)

if (isGoogleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase()
          // Google marks each address as verified or not. Linking on an
          // UNVERIFIED address would let anyone who can create a Google account
          // with someone else's address take over that local account.
          const emailVerified = profile.emails?.[0]?.verified
          const isVerified = emailVerified === true || emailVerified === 'true'

          // 1. Known Google account.
          let user = await User.findOne({ googleId: profile.id })

          // 2. Otherwise link to an existing local account, but only on a
          //    verified address.
          if (!user && email && isVerified) {
            user = await User.findOne({ email })
          }

          if (user) {
            user.googleId = profile.id
            user.name = profile.displayName || user.name
            user.avatar = profile.photos?.[0]?.value || user.avatar
            user.isVerified = true
            // NOTE: role is deliberately NOT touched. Google has no say in it.
            await user.save({ validateBeforeSave: false })
            return done(null, user)
          }

          if (!email) {
            return done(null, false, { message: 'Google account has no email address' })
          }
          if (!isVerified) {
            return done(null, false, { message: 'Google email address is not verified' })
          }

          // 3. Create. New users are always buyers.
          const created = await User.create({
            name: profile.displayName || email.split('@')[0],
            email,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value,
            isVerified: true,
            role: 'buyer',
          })
          return done(null, created)
        } catch (err) {
          return done(err, null)
        }
      }
    )
  )
} else {
  console.warn('Google OAuth disabled - env vars not set')
}

module.exports = { isGoogleConfigured }
