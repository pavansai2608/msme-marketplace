const { app, request, registerUser, SELLER_DETAILS, PRODUCT } = require('./helpers')
const User = require('../models/User')

const makeSeller = async (name, email) => {
  const { cookie } = await registerUser(name, email)
  await request(app).post('/api/auth/become-seller').set('Cookie', cookie).send(SELLER_DETAILS)
  return cookie
}

describe('role enforcement', () => {
  it('a buyer CANNOT create a product (403)', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const res = await request(app).post('/api/products').set('Cookie', cookie).send(PRODUCT)
    expect(res.status).toBe(403)
  })

  it('a seller CAN create a product (201)', async () => {
    const cookie = await makeSeller('Seller One', 'seller1@test.com')
    const res = await request(app).post('/api/products').set('Cookie', cookie).send(PRODUCT)
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe(PRODUCT.name)
  })

  it('a buyer CANNOT reach seller-only reporting (403)', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    for (const path of ['/api/orders/seller', '/api/orders/seller/stats', '/api/orders/seller/forecast']) {
      const res = await request(app).get(path).set('Cookie', cookie)
      expect(res.status).toBe(403)
    }
  })
})

describe('a user cannot set their own role', () => {
  it('update-profile ignores role in the body', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')

    await request(app)
      .put('/api/auth/update-profile')
      .set('Cookie', cookie)
      .send({ role: 'admin', name: 'Buyer One' })

    const user = await User.findOne({ email: 'buyer1@test.com' })
    expect(user.role).toBe('buyer')
  })

  it('update-profile cannot make someone a seller either', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')

    await request(app)
      .put('/api/auth/update-profile')
      .set('Cookie', cookie)
      .send({ role: 'seller', businessName: 'Sneaky Co' })

    const user = await User.findOne({ email: 'buyer1@test.com' })
    expect(user.role).toBe('buyer')

    const res = await request(app).post('/api/products').set('Cookie', cookie).send(PRODUCT)
    expect(res.status).toBe(403)
  })
})

describe('become-seller', () => {
  it('promotes to seller and ignores an injected role', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')

    const res = await request(app)
      .post('/api/auth/become-seller')
      .set('Cookie', cookie)
      .send({ ...SELLER_DETAILS, role: 'admin' })

    expect(res.status).toBe(200)
    const user = await User.findOne({ email: 'buyer1@test.com' })
    expect(user.role).toBe('seller')
    expect(user.role).not.toBe('admin')
  })

  it('requires businessName, panCardName, state and district', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const res = await request(app)
      .post('/api/auth/become-seller')
      .set('Cookie', cookie)
      .send({ businessName: 'Only A Name' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/panCardName/)

    const user = await User.findOne({ email: 'buyer1@test.com' })
    expect(user.role).toBe('buyer')
  })

  it('requires authentication', async () => {
    const res = await request(app).post('/api/auth/become-seller').send(SELLER_DETAILS)
    expect(res.status).toBe(401)
  })
})

describe('admin is unreachable', () => {
  it('no route lets any user reach the admin role', async () => {
    const { cookie } = await registerUser('Climber', 'climber@test.com')

    await request(app).put('/api/auth/update-profile').set('Cookie', cookie).send({ role: 'admin' })
    await request(app).post('/api/auth/become-seller').set('Cookie', cookie).send({ ...SELLER_DETAILS, role: 'admin' })
    await request(app).put('/api/auth/update-profile').set('Cookie', cookie).send({ role: 'admin', isProfileComplete: true })

    const admins = await User.find({ role: 'admin' })
    expect(admins).toHaveLength(0)
  })
})
