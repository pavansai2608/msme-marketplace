/**
 * Double-submit cookie CSRF protection.
 *
 * The server sets a random `csrfToken` cookie that JS CAN read. The client
 * echoes it back in the X-CSRF-Token header. An attacker's page can cause the
 * browser to send the cookie, but the same-origin policy stops it from READING
 * the cookie, so it cannot produce the matching header.
 */
const crypto = require('crypto')
const { CSRF_COOKIE, CSRF_HEADER } = require('../utils/tokens')

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Routes reached before a session exists, or by a cross-site redirect that
// cannot carry a custom header (the Google callback).
const EXEMPT = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/google',
  '/api/auth/google/callback',
]
const isExempt = (path) => EXEMPT.includes(path) || path.startsWith('/api/auth/reset-password/')

/** Ensures every response carries a csrfToken cookie the client can echo. */
exports.issueCsrfCookie = (req, res, next) => {
  if (!req.cookies?.[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('hex'), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
  }
  next()
}

exports.csrfProtection = (req, res, next) => {
  if (!UNSAFE.has(req.method)) return next()
  if (isExempt(req.path)) return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get(CSRF_HEADER)

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ success: false, message: 'CSRF token missing' })
  }

  const a = Buffer.from(String(cookieToken))
  const b = Buffer.from(String(headerToken))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ success: false, message: 'CSRF token mismatch' })
  }

  return next()
}
