const { app, request, registerUser, loginUser, csrfOf, SELLER_DETAILS } = require('./helpers')
const User = require('../models/User')
const Product = require('../models/Product')
const Order = require('../models/Order')

// There is no HTTP route that grants admin - that is the point of the role.
// Tests promote directly in the database, which is exactly what
// scripts/seedAdmin.js does.
const makeAdmin = async (email) => {
  await User.updateOne({ email }, { $set: { role: 'admin' } })
}

// A cookie jar for an admin. The role is read from the database on every
// request, so the promotion applies to the session already held.
const adminSession = async () => {
  const { cookie } = await registerUser('Root Admin', 'root@test.com')
  await makeAdmin('root@test.com')
  return cookie
}

const get = (cookie, url) => request(app).get(url).set('Cookie', cookie)
const patch = (cookie, url) =>
  request(app).patch(url).set('Cookie', cookie).set('x-csrf-token', csrfOf(cookie))

describe('admin routes reject non-admins', () => {
  const ROUTES = [
    ['get', '/api/admin/stats'],
    ['get', '/api/admin/users'],
    ['get', '/api/admin/orders'],
  ]

  it('403s for a buyer on every admin route', async () => {
    const { cookie } = await registerUser('Buyer One', 'buyer1@test.com')
    for (const [method, url] of ROUTES) {
      const res = await request(app)[method](url).set('Cookie', cookie)
      expect([url, res.status]).toEqual([url, 403])
    }

    const user = await User.findOne({ email: 'buyer1@test.com' })
    const patched = await patch(cookie, `/api/admin/users/${user._id}/status`).send({
      isActive: false,
    })
    expect(patched.status).toBe(403)
  })

  it('403s for a seller on every admin route', async () => {
    const { cookie } = await registerUser('Seller One', 'seller1@test.com')
    await request(app)
      .post('/api/auth/become-seller')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfOf(cookie))
      .send(SELLER_DETAILS)

    for (const [method, url] of ROUTES) {
      const res = await request(app)[method](url).set('Cookie', cookie)
      expect([url, res.status]).toEqual([url, 403])
    }
  })

  it('401s when signed out', async () => {
    for (const [method, url] of ROUTES) {
      const res = await request(app)[method](url)
      expect([url, res.status]).toEqual([url, 401])
    }
  })

  it('200s for an admin on every admin route', async () => {
    const cookie = await adminSession()
    for (const [method, url] of ROUTES) {
      const res = await request(app)[method](url).set('Cookie', cookie)
      expect([url, res.status]).toEqual([url, 200])
    }
  })
})

describe('GET /api/admin/stats matches the seeded data', () => {
  // 1 admin, 2 sellers, 3 buyers; 2 products; 3 orders, one of them Cancelled
  // and one of them 30 days old.
  const seed = async () => {
    const cookie = await adminSession()

    const sellerIds = []
    for (const n of [1, 2]) {
      await registerUser(`Seller ${n}`, `seller${n}@test.com`)
      await User.updateOne({ email: `seller${n}@test.com` }, { $set: { role: 'seller' } })
      const u = await User.findOne({ email: `seller${n}@test.com` })
      sellerIds.push(u._id)
    }

    const buyerIds = []
    for (const n of [1, 2, 3]) {
      await registerUser(`Buyer ${n}`, `buyer${n}@test.com`)
      const u = await User.findOne({ email: `buyer${n}@test.com` })
      buyerIds.push(u._id)
    }

    const products = await Product.create([
      {
        seller: sellerIds[0],
        name: 'Clay Pot',
        description: 'A pot',
        price: 500,
        category: 'Pottery',
        images: ['http://example.com/a.png'],
        sizes: [{ size: 'M', stock: 10 }],
      },
      {
        seller: sellerIds[1],
        name: 'Silk Shawl',
        description: 'A shawl',
        price: 1200,
        category: 'Textiles',
        images: ['http://example.com/b.png'],
        sizes: [{ size: 'L', stock: 4 }],
      },
    ])

    const line = (p, sellerId) => [
      { product: p._id, quantity: 1, size: 'M', price: p.price, seller: sellerId },
    ]

    await Order.create({
      buyer: buyerIds[0],
      products: line(products[0], sellerIds[0]),
      totalAmount: 500,
      status: 'Delivered',
    })
    await Order.create({
      buyer: buyerIds[1],
      products: line(products[1], sellerIds[1]),
      totalAmount: 1200,
      status: 'Ordered',
    })
    // Cancelled: counted as an order, excluded from revenue.
    await Order.create({
      buyer: buyerIds[2],
      products: line(products[0], sellerIds[0]),
      totalAmount: 999,
      status: 'Cancelled',
    })

    // Backdate one order past the 7-day window. timestamps:true overrides
    // createdAt on create(), so it has to be written afterwards.
    const old = await Order.create({
      buyer: buyerIds[0],
      products: line(products[0], sellerIds[0]),
      totalAmount: 300,
      status: 'Delivered',
    })
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await Order.collection.updateOne(
      { _id: old._id },
      { $set: { createdAt: thirtyDaysAgo, updatedAt: thirtyDaysAgo } }
    )

    return cookie
  }

  it('reports the exact counts, revenue and 7-day window', async () => {
    const cookie = await seed()
    const res = await get(cookie, '/api/admin/stats')

    expect(res.status).toBe(200)
    const s = res.body.data

    expect(s.users).toEqual({ buyer: 3, seller: 2, admin: 1, total: 6 })
    expect(s.products).toBe(2)
    expect(s.orders).toBe(4)

    // 500 + 1200 + 300; the 999 Cancelled order is excluded.
    expect(s.totalRevenue).toBe(2000)

    // 3 of the 4 orders are recent; the backdated one is not.
    expect(s.ordersLast7Days).toBe(3)
  })

  it('reports zeroes on an empty platform rather than failing', async () => {
    const cookie = await adminSession()
    const res = await get(cookie, '/api/admin/stats')

    expect(res.status).toBe(200)
    expect(res.body.data.products).toBe(0)
    expect(res.body.data.orders).toBe(0)
    expect(res.body.data.totalRevenue).toBe(0)
    expect(res.body.data.ordersLast7Days).toBe(0)
    expect(res.body.data.users.admin).toBe(1)
  })
})

describe('GET /api/admin/users', () => {
  const seedUsers = async () => {
    const cookie = await adminSession()
    await registerUser('Anita Sharma', 'anita@example.com')
    await registerUser('Bhavna Rao', 'bhavna@example.com')
    await registerUser('Chetan Patel', 'chetan@other.com')
    return cookie
  }

  it('paginates', async () => {
    const cookie = await seedUsers()
    const res = await get(cookie, '/api/admin/users?page=1&limit=2')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 4, pages: 2 })

    const page2 = await get(cookie, '/api/admin/users?page=2&limit=2')
    expect(page2.body.data).toHaveLength(2)
    const ids = [...res.body.data, ...page2.body.data].map((u) => u._id)
    expect(new Set(ids).size).toBe(4)
  })

  it('searches by name', async () => {
    const cookie = await seedUsers()
    const res = await get(cookie, '/api/admin/users?search=bhavna')
    expect(res.body.pagination.total).toBe(1)
    expect(res.body.data[0].email).toBe('bhavna@example.com')
  })

  it('searches by email domain', async () => {
    const cookie = await seedUsers()
    const res = await get(cookie, '/api/admin/users?search=@example.com')
    expect(res.body.pagination.total).toBe(2)
  })

  it('never returns password hashes', async () => {
    const cookie = await seedUsers()
    const res = await get(cookie, '/api/admin/users')
    res.body.data.forEach((u) => {
      expect(u.password).toBeUndefined()
      expect(u.refreshTokenHash).toBeUndefined()
    })
  })

  it('treats a regex metacharacter as a literal rather than 500ing', async () => {
    const cookie = await seedUsers()
    const res = await get(cookie, '/api/admin/users?search=' + encodeURIComponent('a(b'))
    expect(res.status).toBe(200)
    expect(res.body.pagination.total).toBe(0)
  })

  it('returns an empty page rather than an error when nothing matches', async () => {
    const cookie = await seedUsers()
    const res = await get(cookie, '/api/admin/users?search=nobodyhere')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })
})

describe('PATCH /api/admin/users/:id/status', () => {
  it('deactivating a user blocks their next request', async () => {
    const adminCookie = await adminSession()
    const { cookie: victimCookie } = await registerUser('Victim', 'victim@test.com')

    // Works before deactivation.
    const before = await get(victimCookie, '/api/auth/me')
    expect(before.status).toBe(200)

    const victim = await User.findOne({ email: 'victim@test.com' })
    const res = await patch(adminCookie, `/api/admin/users/${victim._id}/status`).send({
      isActive: false,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.isActive).toBe(false)

    // Same cookie, same still-valid access token: now refused.
    const after = await get(victimCookie, '/api/auth/me')
    expect(after.status).toBe(403)
    expect(after.body.code).toBe('account_inactive')

    // And they cannot log back in to get a fresh token either.
    const relogin = await loginUser('victim@test.com')
    expect(relogin.res.status).toBe(403)
    expect(relogin.res.body.code).toBe('account_inactive')
  })

  it('login still 401s on a wrong password for a deactivated account', async () => {
    // The deactivation notice must come AFTER the password check, or it
    // becomes a way to enumerate which accounts exist.
    const adminCookie = await adminSession()
    await registerUser('Victim', 'victim@test.com')
    const victim = await User.findOne({ email: 'victim@test.com' })
    await patch(adminCookie, `/api/admin/users/${victim._id}/status`).send({ isActive: false })

    const wrong = await loginUser('victim@test.com', 'wrong-password-99')
    expect(wrong.res.status).toBe(401)
    expect(wrong.res.body.message).toMatch(/Invalid email or password/)
  })

  it('reactivating restores access', async () => {
    const adminCookie = await adminSession()
    const { cookie: victimCookie } = await registerUser('Victim', 'victim@test.com')
    const victim = await User.findOne({ email: 'victim@test.com' })

    await patch(adminCookie, `/api/admin/users/${victim._id}/status`).send({ isActive: false })
    expect((await get(victimCookie, '/api/auth/me')).status).toBe(403)

    await patch(adminCookie, `/api/admin/users/${victim._id}/status`).send({ isActive: true })
    expect((await get(victimCookie, '/api/auth/me')).status).toBe(200)
  })

  it('refuses a non-boolean isActive', async () => {
    const adminCookie = await adminSession()
    const victim = await User.findOne({ email: 'root@test.com' })
    const res = await patch(adminCookie, `/api/admin/users/${victim._id}/status`).send({
      isActive: 'false',
    })
    expect(res.status).toBe(400)
  })

  it('refuses to let an admin deactivate themselves', async () => {
    const adminCookie = await adminSession()
    const me = await User.findOne({ email: 'root@test.com' })
    const res = await patch(adminCookie, `/api/admin/users/${me._id}/status`).send({
      isActive: false,
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/your own account/i)

    const still = await User.findById(me._id)
    expect(still.isActive).not.toBe(false)
  })

  it('404s for an unknown user', async () => {
    const adminCookie = await adminSession()
    const res = await patch(adminCookie, '/api/admin/users/64b7f9c2e1a2b3c4d5e6f7a8/status').send({
      isActive: false,
    })
    expect(res.status).toBe(404)
  })

  it('is blocked without the CSRF header', async () => {
    const adminCookie = await adminSession()
    const victim = await User.findOne({ email: 'root@test.com' })
    const res = await request(app)
      .patch(`/api/admin/users/${victim._id}/status`)
      .set('Cookie', adminCookie)
      .send({ isActive: true })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/orders', () => {
  const seedOrders = async () => {
    const cookie = await adminSession()
    await registerUser('Buyer One', 'buyer1@test.com')
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

    for (const status of ['Ordered', 'Ordered', 'Delivered', 'Cancelled']) {
      await Order.create({
        buyer: buyer._id,
        products: [
          { product: product._id, quantity: 1, size: 'M', price: 500, seller: seller._id },
        ],
        totalAmount: 500,
        status,
      })
    }
    return cookie
  }

  it('paginates and populates the buyer', async () => {
    const cookie = await seedOrders()
    const res = await get(cookie, '/api/admin/orders?limit=3')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
    expect(res.body.pagination).toMatchObject({ total: 4, pages: 2 })
    expect(res.body.data[0].buyer.email).toBe('buyer1@test.com')
    expect(res.body.data[0].buyer.password).toBeUndefined()
  })

  it('filters by status', async () => {
    const cookie = await seedOrders()
    const res = await get(cookie, '/api/admin/orders?status=Ordered')
    expect(res.body.pagination.total).toBe(2)
    res.body.data.forEach((o) => expect(o.status).toBe('Ordered'))

    const cancelled = await get(cookie, '/api/admin/orders?status=Cancelled')
    expect(cancelled.body.pagination.total).toBe(1)
  })

  it('400s on a status outside the schema enum', async () => {
    const cookie = await seedOrders()
    const res = await get(cookie, '/api/admin/orders?status=Teleported')
    expect(res.status).toBe(400)
  })
})
