/**
 * Access and refresh token issuing, rotation and cookie handling.
 */
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const ACCESS_TTL = '15m'
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const ACCESS_COOKIE = 'token'
const REFRESH_COOKIE = 'refreshToken'
const CSRF_COOKIE = 'csrfToken'
const CSRF_HEADER = 'x-csrf-token'

// Refresh tokens are signed with a secret derived from, but not equal to,
// JWT_SECRET. An access token can then never be replayed as a refresh token
// (or the reverse) even though only one secret is configured.
const accessSecret = () => process.env.JWT_SECRET
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}:refresh`

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex')

// A unique id per token. Without it, two tokens for the same user signed
// within the same second are byte-identical (iat has one-second resolution),
// so rotation would hand back the token it was meant to replace and replay
// detection would never fire.
const jti = () => crypto.randomBytes(16).toString('hex')

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), v: user.tokenVersion || 0, typ: 'access', jti: jti() },
    accessSecret(),
    { expiresIn: ACCESS_TTL }
  )

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id.toString(), typ: 'refresh', jti: jti() }, refreshSecret(), {
    expiresIn: '7d',
  })

const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, accessSecret())
  if (payload.typ !== 'access') throw new Error('Wrong token type')
  return payload
}

const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, refreshSecret())
  if (payload.typ !== 'refresh') throw new Error('Wrong token type')
  return payload
}

const baseCookie = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
})

/**
 * Issues a fresh access + refresh pair, stores the refresh hash on the user,
 * and sets all three cookies. Returns the raw tokens (tests use them).
 */
const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)

  user.refreshTokenHash = hash(refreshToken)
  user.refreshTokenExpire = new Date(Date.now() + REFRESH_TTL_MS)
  await user.save({ validateBeforeSave: false })

  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie(), maxAge: 15 * 60 * 1000 })
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie(),
    maxAge: REFRESH_TTL_MS,
    path: '/api/auth',
  })

  // Readable by JS on purpose: the client echoes it back in a header, which
  // is the whole point of the double-submit pattern.
  res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('hex'), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TTL_MS,
  })

  return { accessToken, refreshToken }
}

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie() })
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: '/api/auth' })
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

/** Revokes every token for a user: the stored refresh hash and all access tokens. */
const revokeAllTokens = async (user) => {
  user.refreshTokenHash = undefined
  user.refreshTokenExpire = undefined
  user.tokenVersion = (user.tokenVersion || 0) + 1
  await user.save({ validateBeforeSave: false })
}

module.exports = {
  ACCESS_TTL,
  REFRESH_TTL_MS,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  hash,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  issueTokens,
  clearAuthCookies,
  revokeAllTokens,
}
