/**
 * Seeds the fixtures the Playwright end-to-end suite runs against, and clears
 * out whatever a previous run left behind.
 *
 *   node scripts/seedE2E.js            # purge stale e2e data, then seed
 *   node scripts/seedE2E.js --clean    # purge only, seed nothing
 *   node scripts/seedE2E.js --print    # print the fixture credentials as JSON
 *
 * Two kinds of document exist here:
 *
 *   FIXTURES  - a fixed buyer, a fixed seller and one product, all with
 *               deterministic ids. Tests read them and never change them, so
 *               they can run in parallel against the same account.
 *
 *   RUN DATA  - anything a test creates: an account registered by the sign-up
 *               test, a product listed by the become-seller test, an order
 *               placed by the checkout test. All of it is reachable from an
 *               email matching E2E_RUN_PREFIX, or owned by the fixture buyer,
 *               which is what makes the purge below exact rather than a
 *               guess at "test-looking" data.
 *
 * Nothing outside those two sets is touched. The purge never runs a broad
 * match like /test/i against a database that also holds real records.
 */
require('dotenv').config()
const mongoose = require('mongoose')

const User = require('../models/User')
const Product = require('../models/Product')
const Order = require('../models/Order')
const Cart = require('../models/Cart')

// Accounts a test registers for itself are named e2e-run-<something>@...
// The suite generates them; this prefix is the contract between the two.
const RUN_PREFIX = 'e2e-run-'

const FIXTURE = {
  password: 'E2ePassw0rd!',
  buyer: {
    email: 'e2e-buyer@msme.local',
    name: 'E2E Buyer',
    role: 'buyer',
  },
  seller: {
    email: 'e2e-seller@msme.local',
    name: 'E2E Seller',
    role: 'seller',
    businessName: 'E2E Fixture Works',
    panCardName: 'E2E Seller',
    state: 'Karnataka',
    district: 'Bangalore Urban',
    isProfileComplete: true,
  },
  // A product with a name no synthetic seed will ever generate, so the search
  // test matches exactly one row and the assertion cannot be satisfied by
  // some unrelated item that happens to share a word.
  product: {
    name: 'E2E Fixture Brass Lamp',
    description:
      'Fixture product for the automated end-to-end suite. Hand-finished brass lamp with an engraved base, listed so the search, cart and checkout flows always have a known item to work with.',
    price: 1499,
    category: 'Metalwork',
    images: ['https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800'],
    sizes: [{ size: 'Standard', stock: 999 }],
    state: 'Karnataka',
    district: 'Bangalore Urban',
    sku: 'E2E-FIXTURE-LAMP',
    lowStockThreshold: 1,
    // Left listed even at zero stock, so a runaway checkout loop cannot
    // delist the one product every shopping test depends on.
    autoDelist: false,
  },
}

const log = (...args) => console.log('[seedE2E]', ...args)

/** Creates the user if absent; otherwise forces it back to the fixture state. */
async function upsertUser({ email, password, ...fields }) {
  let user = await User.findOne({ email })

  if (!user) {
    user = new User({ email, password, ...fields })
    await user.save()
    log(`created ${email} (${fields.role})`)
    return user
  }

  Object.assign(user, fields)
  // Always reset the password. A run that leaves it changed would fail every
  // later run with a login error that looks like a broken app.
  user.password = password
  user.isActive = true
  await user.save()
  log(`refreshed ${email} (${fields.role})`)
  return user
}

async function purge() {
  // Accounts the suite registered for itself, and everything hanging off them.
  const runUsers = await User.find({ email: new RegExp(`^${RUN_PREFIX}`, 'i') }).select('_id email')
  const runUserIds = runUsers.map((u) => u._id)

  const fixtureBuyer = await User.findOne({ email: FIXTURE.buyer.email }).select('_id')
  const fixtureSeller = await User.findOne({ email: FIXTURE.seller.email }).select('_id')

  // Orders: from a run account, or placed against the fixture buyer by the
  // checkout test.
  const orderOwners = [...runUserIds, ...(fixtureBuyer ? [fixtureBuyer._id] : [])]
  const orders = orderOwners.length
    ? await Order.deleteMany({ buyer: { $in: orderOwners } })
    : { deletedCount: 0 }

  // Products: listed by a run account (the become-seller test), or any extra
  // product under the fixture seller that is not the fixture product itself.
  const productFilters = []
  if (runUserIds.length) productFilters.push({ seller: { $in: runUserIds } })
  if (fixtureSeller) {
    productFilters.push({ seller: fixtureSeller._id, sku: { $ne: FIXTURE.product.sku } })
  }
  const products = productFilters.length
    ? await Product.deleteMany({ $or: productFilters })
    : { deletedCount: 0 }

  // Carts: run accounts get theirs deleted, the fixture buyer gets theirs
  // emptied so a half-finished checkout cannot leak into the next run.
  const carts = runUserIds.length
    ? await Cart.deleteMany({ user: { $in: runUserIds } })
    : { deletedCount: 0 }
  if (fixtureBuyer) {
    await Cart.updateOne({ user: fixtureBuyer._id }, { $set: { items: [] } })
  }

  const users = runUserIds.length
    ? await User.deleteMany({ _id: { $in: runUserIds } })
    : { deletedCount: 0 }

  log(
    `purged: ${users.deletedCount} run accounts, ${products.deletedCount} products, ` +
      `${orders.deletedCount} orders, ${carts.deletedCount} carts` +
      (fixtureBuyer ? ', fixture cart emptied' : '')
  )
}

async function seed() {
  const buyer = await upsertUser({ ...FIXTURE.buyer, password: FIXTURE.password })
  const seller = await upsertUser({ ...FIXTURE.seller, password: FIXTURE.password })

  const existing = await Product.findOne({ sku: FIXTURE.product.sku })
  if (existing) {
    Object.assign(existing, FIXTURE.product, { seller: seller._id, isActive: true })
    await existing.save()
    log(`refreshed product "${FIXTURE.product.name}"`)
  } else {
    await Product.create({ ...FIXTURE.product, seller: seller._id })
    log(`created product "${FIXTURE.product.name}"`)
  }

  return { buyer, seller }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--print')) {
    // Credentials only - no database connection, nothing secret. The suite
    // uses this to stay in step with the fixture definition above.
    console.log(
      JSON.stringify(
        {
          password: FIXTURE.password,
          buyerEmail: FIXTURE.buyer.email,
          sellerEmail: FIXTURE.seller.email,
          productName: FIXTURE.product.name,
          runPrefix: RUN_PREFIX,
        },
        null,
        2
      )
    )
    return
  }

  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not set. This script reads msme-backend/.env.')
  }

  await mongoose.connect(process.env.MONGO_URL)
  log('connected')

  await purge()
  if (!args.includes('--clean')) {
    await seed()
  }

  await mongoose.disconnect()
  log('done')
}

main().catch(async (err) => {
  console.error('[seedE2E] failed:', err.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})

module.exports = { FIXTURE, RUN_PREFIX }
