const passport      = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User          = require('../models/User')
require('dotenv').config()

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
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
