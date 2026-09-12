const { app, request, registerUser, SELLER_DETAILS, PRODUCT } = require('./helpers')
const User = require('../models/User')
const Product = require('../models/Product')
const Order = require('../models/Order')

// Builds: a seller who owns the product, a buyer who owns the order,
// and an unrelated seller who should be refused everywhere.
const scenario = async () => {
  const { cookie: sellerCookie } = await registerUser('Seller One', 'seller1@test.com')
  await request(app).post('/api/auth/become-seller').set('Cookie', sellerCookie).send(SELLER_DETAILS)

  const { cookie: buyerCookie } = await registerUser('Buyer One', 'buyer1@test.com')

  const { cookie: strangerCookie } = await registerUser('Stranger', 'stranger@test.com')
  await request(app)
    .post('/api/auth/become-seller')
    .set('Cookie', strangerCookie)
    .send({ ...SELLER_DETAILS, businessName: 'Unrelated Traders' })

  const created = await request(app).post('/api/products').set('Cookie', sellerCookie).send(PRODUCT)
  const seller = await User.findOne({ email: 'seller1@test.com' })
  const buyer = await User.findOne({ email: 'buyer1@test.com' })
  const product = await Product.findById(created.body.data._id)

  const order = await Order.create({
    buyer: buyer._id,
    products: [{ product: product._id, quantity: 1, size: 'M', price: 500, seller: seller._id }],
    shippingAddress: { name: 'Buyer One', street: '1 Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001', phone: '9999999999' },
    totalAmount: 550,
    status: 'Ordered',
  })

  return { sellerCookie, buyerCookie, strangerCookie, order }
}

describe('POST /api/orders/:id/generate-waybill', () => {
  it('the owning seller CAN generate a waybill (200)', async () => {
    const { sellerCookie, order } = await scenario()
    const res = await request(app).post(`/api/orders/${order._id}/generate-waybill`).set('Cookie', sellerCookie)
    expect(res.status).toBe(200)
    expect(res.body.trackingId).toMatch(/^SR/)
  })

  it('an unrelated seller CANNOT (403)', async () => {
    const { strangerCookie, order } = await scenario()
    const res = await request(app).post(`/api/orders/${order._id}/generate-waybill`).set('Cookie', strangerCookie)
    expect(res.status).toBe(403)
  })

  it('the order is left untouched after a refused attempt', async () => {
    const { strangerCookie, order } = await scenario()
    await request(app).post(`/api/orders/${order._id}/generate-waybill`).set('Cookie', strangerCookie)
    const after = await Order.findById(order._id)
    expect(after.status).toBe('Ordered')
    expect(after.trackingId).toBeUndefined()
  })
})

describe('GET /api/orders/track/:trackingId', () => {
  const track = async () => {
    const s = await scenario()
    const wb = await request(app).post(`/api/orders/${s.order._id}/generate-waybill`).set('Cookie', s.sellerCookie)
    return { ...s, trackingId: wb.body.trackingId }
  }

  it('the buyer on the order CAN track it (200)', async () => {
    const { buyerCookie, trackingId } = await track()
    const res = await request(app).get(`/api/orders/track/${trackingId}`).set('Cookie', buyerCookie)
    expect(res.status).toBe(200)
  })

  it('the seller on the order CAN track it (200)', async () => {
    const { sellerCookie, trackingId } = await track()
    const res = await request(app).get(`/api/orders/track/${trackingId}`).set('Cookie', sellerCookie)
    expect(res.status).toBe(200)
  })

  it('a stranger CANNOT (403)', async () => {
    const { strangerCookie, trackingId } = await track()
    const res = await request(app).get(`/api/orders/track/${trackingId}`).set('Cookie', strangerCookie)
    expect(res.status).toBe(403)
  })

  it('a refused response leaks no buyer name or email', async () => {
    const { strangerCookie, trackingId } = await track()
    const res = await request(app).get(`/api/orders/track/${trackingId}`).set('Cookie', strangerCookie)
    const body = JSON.stringify(res.body)
    expect(body).not.toContain('buyer1@test.com')
    expect(body).not.toContain('Buyer One')
  })

  it('requires authentication', async () => {
    const { trackingId } = await track()
    const res = await request(app).get(`/api/orders/track/${trackingId}`)
    expect(res.status).toBe(401)
  })
})
