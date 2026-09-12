const { app, request, registerUser, loginUser, rawTokenCookie } = require('./helpers')

describe('auth transport', () => {
  it('register returns 201 and does NOT put the JWT in the body', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    expect(res.status).toBe(201)
    expect(res.body.token).toBeUndefined()
    expect(res.body.user).toBeDefined()
  })

  it('sets an HttpOnly auth cookie', async () => {
    const { res, cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    expect(cookie).toMatch(/^token=/)
    expect(rawTokenCookie(res)).toMatch(/HttpOnly/i)
  })

  it('does NOT mark the cookie Secure outside production', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    expect(process.env.NODE_ENV).toBe('test')
    expect(rawTokenCookie(res)).not.toMatch(/Secure/i)
  })

  it('login does NOT put the JWT in the body', async () => {
    await registerUser('Buyer One', 'buyer1@test.com')
    const { res } = await loginUser('buyer1@test.com')
    expect(res.status).toBe(200)
    expect(res.body.token).toBeUndefined()
  })

  it('rejects a password under 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short', email: 'short@test.com', password: 'abc12' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/8 characters/)
  })

  it('rejects an unauthenticated /me with 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('forgot-password does not enumerate users', () => {
  it('returns an identical 200 for known and unknown emails', async () => {
    await registerUser('Buyer One', 'buyer1@test.com')
    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'buyer1@test.com' })
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@test.com' })

    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(known.body.message).toBe(unknown.body.message)
  })
})

describe('Google OAuth when not configured', () => {
  it('GET /api/auth/google returns 503', async () => {
    const res = await request(app).get('/api/auth/google')
    expect(res.status).toBe(503)
    expect(res.body.message).toMatch(/not configured/i)
  })

  it('GET /api/auth/google/callback returns 503', async () => {
    const res = await request(app).get('/api/auth/google/callback')
    expect(res.status).toBe(503)
    expect(res.body.message).toMatch(/not configured/i)
  })
})
