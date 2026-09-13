const { app, request, registerUser, csrfOf } = require('./helpers')
const Product = require('../models/Product')
const Cart = require('../models/Cart')
const User = require('../models/User')

// The client mirrors these rules in msme-frontend/src/lib/schemas.js. These
// tests are what make that mirroring meaningful: if the server drifts, the
// form starts accepting things the API rejects.
const VALID_ADDRESS = {
  name: 'Buyer One',
  phone: '9876543210',
  pincode: '500001',
  locality: 'Banjara Hills',
  street: '1 Road',
  city: 'Hyderabad',
  state: 'Telangana',
}

const post = (cookie, url) =>
  request(app).post(url).set('Cookie', cookie).set('x-csrf-token', csrfOf(cookie))

describe('password minimum length', () => {
  it('rejects a 7-character password at registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Shorty', email: 'shorty@test.com', password: 'abc1234' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/at least 8 characters/i)
    expect(await User.findOne({ email: 'shorty@test.com' })).toBeNull()
  })

  it('accepts exactly 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Fine', email: 'fine@test.com', password: 'abcd1234' })
    expect(res.status).toBe(201)
  })
})

describe('saved address validation', () => {
  it('rejects a 5-digit pincode with 400, not 500', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const res = await post(cookie, '/api/user/addresses').send({
      ...VALID_ADDRESS,
      pincode: '50000',
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/6 digits/)
  })

  it('rejects a 9-digit phone with 400', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const res = await post(cookie, '/api/user/addresses').send({
      ...VALID_ADDRESS,
      phone: '987654321',
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/10 digits/)
  })

  it('rejects a non-numeric phone', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const res = await post(cookie, '/api/user/addresses').send({
      ...VALID_ADDRESS,
      phone: '98765abcde',
    })
    expect(res.status).toBe(400)
  })

  it('accepts a valid address and stores it', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const res = await post(cookie, '/api/user/addresses').send(VALID_ADDRESS)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].pincode).toBe('500001')
  })

  it('accepts an empty altPhone but rejects a malformed one', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')

    const blank = await post(cookie, '/api/user/addresses').send({
      ...VALID_ADDRESS,
      altPhone: '',
    })
    expect(blank.status).toBe(200)

    const bad = await post(cookie, '/api/user/addresses').send({
      ...VALID_ADDRESS,
      altPhone: '123',
    })
    expect(bad.status).toBe(400)
  })

  it('applies the same rules on update', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const created = await post(cookie, '/api/user/addresses').send(VALID_ADDRESS)
    const id = created.body.data[0]._id

    const res = await request(app)
      .put(`/api/user/addresses/${id}`)
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfOf(cookie))
      .send({ ...VALID_ADDRESS, pincode: 'ABCDEF' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/6 digits/)
  })
})

describe('checkout shipping address validation', () => {
  // A checkout writes its address onto the Order, never onto savedAddresses,
  // so it bypasses the schema validators and needs its own check.
  const cartedBuyer = async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const buyer = await User.findOne({ email: 'buyer1@test.com' })
    await registerUser('Seller One', 'seller1@test.com')
    const seller = await User.findOne({ email: 'seller1@test.com' })

    const product = await Product.create({
      seller: seller._id,
      name: 'Clay Pot',
      description: 'A pot',
      price: 500,
      category: 'Pottery',
      images: ['http://example.com/a.png'],
      sizes: [{ size: 'M', stock: 10 }],
    })

    await Cart.create({
      user: buyer._id,
      items: [{ product: product._id, quantity: 1, size: 'M' }],
    })
    return cookie
  }

  it('rejects a 5-digit pincode', async () => {
    const cookie = await cartedBuyer()
    const res = await post(cookie, '/api/orders/checkout').send({
      shippingAddress: { ...VALID_ADDRESS, pincode: '50000' },
      paymentMethod: 'COD',
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/6 digits/)
  })

  it('rejects a short phone', async () => {
    const cookie = await cartedBuyer()
    const res = await post(cookie, '/api/orders/checkout').send({
      shippingAddress: { ...VALID_ADDRESS, phone: '12345' },
      paymentMethod: 'COD',
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/10 digits/)
  })

  it('rejects a missing address outright', async () => {
    const cookie = await cartedBuyer()
    const res = await post(cookie, '/api/orders/checkout').send({ paymentMethod: 'COD' })
    expect(res.status).toBe(400)
  })

  it('accepts a well-formed address', async () => {
    const cookie = await cartedBuyer()
    const res = await post(cookie, '/api/orders/checkout').send({
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
    })
    expect(res.status).toBe(201)
  })
})
