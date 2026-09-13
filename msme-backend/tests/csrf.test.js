const { app, request, registerUser, cookieFrom, csrfFrom } = require('./helpers')
const User = require('../models/User')

describe('CSRF double-submit protection', () => {
  it('blocks a forged POST that carries cookies but no header', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')

    // Exactly what a cross-site form post looks like: the browser attaches the
    // cookies, but the attacker's page cannot read them to build the header.
    const forged = await request(app)
      .post('/api/auth/become-seller')
      .set('Cookie', cookieFrom(res))
      .send({ businessName: 'Evil Co', panCardName: 'E', state: 'X', district: 'Y' })

    expect(forged.status).toBe(403)
    expect(forged.body.message).toMatch(/CSRF/i)

    const user = await User.findOne({ email: 'buyer1@test.com' })
    expect(user.role).toBe('buyer')
  })

  it('blocks a POST whose header does not match the cookie', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')

    const forged = await request(app)
      .post('/api/auth/become-seller')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', 'not-the-right-value')
      .send({ businessName: 'Evil Co', panCardName: 'E', state: 'X', district: 'Y' })

    expect(forged.status).toBe(403)
    expect(forged.body.message).toMatch(/mismatch/i)
  })

  it('allows the same POST when the header matches', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')

    const ok = await request(app)
      .post('/api/auth/become-seller')
      .set('Cookie', cookieFrom(res))
      .set('x-csrf-token', csrfFrom(res))
      .send({
        businessName: 'Honest Co',
        panCardName: 'H',
        state: 'Telangana',
        district: 'Hyderabad',
      })

    expect(ok.status).toBe(200)
    const user = await User.findOne({ email: 'buyer1@test.com' })
    expect(user.role).toBe('seller')
  })

  it('protects PUT and DELETE as well as POST', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')

    const put = await request(app)
      .put('/api/auth/update-profile')
      .set('Cookie', cookieFrom(res))
      .send({ name: 'Renamed' })
    expect(put.status).toBe(403)

    const del = await request(app)
      .delete('/api/user/wishlist/someid')
      .set('Cookie', cookieFrom(res))
    expect(del.status).toBe(403)
  })

  it('leaves safe methods alone', async () => {
    const { res } = await registerUser('Buyer One', 'buyer1@test.com')
    const get = await request(app).get('/api/auth/me').set('Cookie', cookieFrom(res))
    expect(get.status).toBe(200)
  })

  it('exempts login and register, which run before any session exists', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Csrf', email: 'nocsrf@test.com', password: 'abcd1234' })
    expect(reg.status).toBe(201)

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nocsrf@test.com', password: 'abcd1234' })
    expect(login.status).toBe(200)
  })

  it('hands out a csrf cookie to a brand new visitor', async () => {
    const res = await request(app).get('/health')
    const cookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('csrfToken='))
    expect(cookie).toBeTruthy()
    expect(cookie).not.toMatch(/HttpOnly/i)
  })
})
