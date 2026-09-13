const {
  app,
  request,
  registerUser,
  loginUser,
  namedCookie,
  cookieFrom,
  csrfFrom,
} = require('./helpers')
const User = require('../models/User')
const { signAccessToken, hash } = require('../utils/tokens')

const raw = (res, name) =>
  (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`)) || ''

describe('login issues both cookies', () => {
  it('sets an access AND a refresh cookie, both HttpOnly', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')

    const access = raw(res, 'token')
    const refresh = raw(res, 'refreshToken')

    expect(access).toMatch(/HttpOnly/i)
    expect(refresh).toMatch(/HttpOnly/i)
    expect(access).toMatch(/SameSite=Lax/i)
    expect(refresh).toMatch(/SameSite=Lax/i)
    // Not production, so neither is Secure.
    expect(access).not.toMatch(/Secure/i)
    expect(refresh).not.toMatch(/Secure/i)
    // The refresh cookie is only sent to the auth routes that need it.
    expect(refresh).toMatch(/Path=\/api\/auth/i)
  })

  it('puts no token in the response body', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    expect(res.body.token).toBeUndefined()
    expect(res.body.refreshToken).toBeUndefined()
  })

  it('stores only a HASH of the refresh token, never the token itself', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    const refreshValue = namedCookie(res, 'refreshToken').split('=')[1]

    const user = await User.findOne({ email: 'buyer1@test.com' }).select('+refreshTokenHash')
    expect(user.refreshTokenHash).toBeTruthy()
    expect(user.refreshTokenHash).not.toBe(refreshValue)
    expect(user.refreshTokenHash).toBe(hash(refreshValue))
  })

  it('issues a readable csrf cookie', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    expect(raw(res, 'csrfToken')).not.toMatch(/HttpOnly/i)
  })
})

describe('POST /api/auth/refresh rotates', () => {
  it('returns a different refresh token and updates the stored hash', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    const first = namedCookie(res, 'refreshToken').split('=')[1]

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', csrfFrom(res))

    expect(refreshed.status).toBe(200)
    const second = namedCookie(refreshed, 'refreshToken').split('=')[1]
    expect(second).toBeTruthy()
    expect(second).not.toBe(first)

    const user = await User.findOne({ email: 'buyer1@test.com' }).select('+refreshTokenHash')
    expect(user.refreshTokenHash).toBe(hash(second))
  })

  it('also mints a new access token', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', csrfFrom(res))
    expect(namedCookie(refreshed, 'token')).toBeTruthy()
  })

  it('rejects a request with no refresh cookie', async () => {
    // A matching CSRF pair is supplied so this reaches the refresh handler;
    // otherwise CSRF would reject it first with 403.
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'csrfToken=abc')
      .set('x-csrf-token', 'abc')
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/no refresh token/i)
  })

  it('is itself CSRF protected', async () => {
    const res = await request(app).post('/api/auth/refresh')
    expect(res.status).toBe(403)
  })

  it('refuses an access token presented as a refresh token', async () => {
    await registerUser('Buyer One', 'buyer1@test.com')
    const user = await User.findOne({ email: 'buyer1@test.com' })
    const access = signAccessToken(user)

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `refreshToken=${access}; csrfToken=x`)
      .set('x-csrf-token', 'x')

    expect(res.status).toBe(401)
  })
})

describe('reuse of a spent refresh token revokes the family', () => {
  it('revokes everything and blocks the current token too', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    const oldCookies = cookieFrom(res)
    const oldCsrf = csrfFrom(res)

    // Rotate once: the original refresh token is now spent.
    const rotated = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', oldCookies)
      .set('x-csrf-token', oldCsrf)
    expect(rotated.status).toBe(200)

    const before = await User.findOne({ email: 'buyer1@test.com' })
    const versionBefore = before.tokenVersion

    // Replay the spent one.
    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', oldCookies)
      .set('x-csrf-token', oldCsrf)

    expect(replay.status).toBe(401)
    expect(replay.body.code).toBe('token_reuse')

    const after = await User.findOne({ email: 'buyer1@test.com' }).select('+refreshTokenHash')
    expect(after.refreshTokenHash).toBeFalsy()
    expect(after.tokenVersion).toBe(versionBefore + 1)

    // The legitimate (rotated) refresh token is dead too.
    const legit = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieFrom(rotated))
      .set('x-csrf-token', csrfFrom(rotated))
    expect(legit.status).toBe(401)

    // And so is the access token that was valid a moment ago.
    const me = await request(app).get('/api/auth/me').set('Cookie', cookieFrom(rotated))
    expect(me.status).toBe(401)
    expect(me.body.code).toBe('token_revoked')
  })
})

describe('logout', () => {
  it('clears both cookies and the stored hash', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')

    const out = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', csrfFrom(res))

    expect(out.status).toBe(200)
    // Express clears a cookie by setting it empty with an expiry in the past.
    expect(raw(out, 'token')).toMatch(/token=;/)
    expect(raw(out, 'refreshToken')).toMatch(/refreshToken=;/)

    const user = await User.findOne({ email: 'buyer1@test.com' }).select('+refreshTokenHash')
    expect(user.refreshTokenHash).toBeFalsy()
  })

  it('makes the old refresh token unusable', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', csrfFrom(res))

    const after = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', csrfFrom(res))
    expect(after.status).toBe(401)
  })
})

describe('an expired access token can be exchanged via refresh', () => {
  it('401s with token_expired, then refresh yields a working access token', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    const user = await User.findOne({ email: 'buyer1@test.com' })

    // Mint an already-expired access token for this user.
    const jwt = require('jsonwebtoken')
    const expired = jwt.sign(
      { id: user._id.toString(), v: user.tokenVersion || 0, typ: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    )

    const denied = await request(app).get('/api/auth/me').set('Cookie', `token=${expired}`)
    expect(denied.status).toBe(401)
    expect(denied.body.code).toBe('token_expired')

    // The refresh cookie is still good, so the client can recover silently.
    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', csrfFrom(res))
    expect(refreshed.status).toBe(200)

    const retried = await request(app).get('/api/auth/me').set('Cookie', cookieFrom(refreshed))
    expect(retried.status).toBe(200)
    expect(retried.body.user.email).toBe('buyer1@test.com')
  })
})

describe('login after logout works normally', () => {
  it('issues a fresh pair', async () => {
    await registerUser('Buyer One', 'buyer1@test.com')
    const { res } = await loginUser('buyer1@test.com')
    expect(res.status).toBe(200)
    expect(namedCookie(res, 'token')).toBeTruthy()
    expect(namedCookie(res, 'refreshToken')).toBeTruthy()
  })
})
