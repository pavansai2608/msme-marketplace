// The recommender service is mocked: these tests are about the Node
// integration - ordering, filtering, and the fallback when it is unavailable.
jest.mock('../utils/recommender')

const { app, request, registerUser, SELLER_DETAILS } = require('./helpers')
const recommender = require('../utils/recommender')
const Product = require('../models/Product')
const User = require('../models/User')

const seedProducts = async () => {
  const { cookie } = await registerUser('Seller One', 'seller1@test.com')
  await request(app).post('/api/auth/become-seller').set('Cookie', cookie).send(SELLER_DETAILS)
  const seller = await User.findOne({ email: 'seller1@test.com' })

  const make = (name, extra = {}) => ({
    seller: seller._id,
    name,
    description: `${name} description`,
    price: 100,
    category: 'Pottery',
    images: ['http://example.com/x.png'],
    sizes: [{ size: 'M', stock: 5 }],
    ...extra,
  })

  const a = await Product.create(make('Alpha'))
  const b = await Product.create(make('Bravo'))
  const c = await Product.create(make('Charlie'))
  const hidden = await Product.create(make('Hidden', { isActive: false }))
  return { cookie, a, b, c, hidden }
}

beforeEach(() => jest.resetAllMocks())

describe('GET /api/products/:id/similar', () => {
  it('returns the recommender ordering exactly', async () => {
    const { a, b, c } = await seedProducts()
    recommender.similarToProduct.mockResolvedValue([c._id.toString(), b._id.toString()])

    const res = await request(app).get(`/api/products/${a._id}/similar`)

    expect(res.status).toBe(200)
    expect(res.body.source).toBe('recommender')
    expect(res.body.data.map((p) => p.name)).toEqual(['Charlie', 'Bravo'])
  })

  it('falls back to newest-first when the recommender is down', async () => {
    const { a } = await seedProducts()
    recommender.similarToProduct.mockResolvedValue(null)

    const res = await request(app).get(`/api/products/${a._id}/similar`)

    expect(res.status).toBe(200)
    expect(res.body.source).toBe('fallback')
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data.some((p) => p._id === a._id.toString())).toBe(false)
  })

  it('never returns an inactive product the recommender suggested', async () => {
    const { a, hidden, b } = await seedProducts()
    recommender.similarToProduct.mockResolvedValue([hidden._id.toString(), b._id.toString()])

    const res = await request(app).get(`/api/products/${a._id}/similar`)

    expect(res.body.data.map((p) => p.name)).toEqual(['Bravo'])
  })

  it('still answers 200 when the recommender throws', async () => {
    const { a } = await seedProducts()
    recommender.similarToProduct.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await request(app).get(`/api/products/${a._id}/similar`)

    expect(res.status).toBe(200)
    expect(res.body.source).toBe('fallback')
  })

  it('honours k', async () => {
    const { a, b, c } = await seedProducts()
    recommender.similarToProduct.mockResolvedValue([b._id.toString(), c._id.toString()])

    await request(app).get(`/api/products/${a._id}/similar?k=3`)

    expect(recommender.similarToProduct).toHaveBeenCalledWith(a._id.toString(), 3)
  })
})

describe('GET /api/products/recommended', () => {
  it('uses trending for an anonymous visitor', async () => {
    const { b } = await seedProducts()
    recommender.trending.mockResolvedValue([b._id.toString()])

    const res = await request(app).get('/api/products/recommended')

    expect(res.status).toBe(200)
    expect(recommender.trending).toHaveBeenCalled()
    expect(recommender.recommendForUser).not.toHaveBeenCalled()
    expect(res.body.data[0].name).toBe('Bravo')
  })

  it('personalises for a signed-in user', async () => {
    const { c } = await seedProducts()
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    const buyer = await User.findOne({ email: 'buyer1@test.com' })
    recommender.recommendForUser.mockResolvedValue([c._id.toString()])

    const res = await request(app).get('/api/products/recommended').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(recommender.recommendForUser).toHaveBeenCalledWith(buyer._id.toString(), 10)
    expect(res.body.data[0].name).toBe('Charlie')
  })

  it('treats an invalid token as anonymous rather than 401', async () => {
    const { b } = await seedProducts()
    recommender.trending.mockResolvedValue([b._id.toString()])

    const res = await request(app)
      .get('/api/products/recommended')
      .set('Cookie', 'token=not-a-real-jwt')

    expect(res.status).toBe(200)
    expect(recommender.trending).toHaveBeenCalled()
  })

  it('falls back when the recommender is unavailable', async () => {
    await seedProducts()
    recommender.trending.mockResolvedValue(null)

    const res = await request(app).get('/api/products/recommended')

    expect(res.status).toBe(200)
    expect(res.body.source).toBe('fallback')
    expect(res.body.data.length).toBeGreaterThan(0)
  })
})
