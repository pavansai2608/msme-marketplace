/**
 * Seeds a SYNTHETIC catalogue and order history.
 *
 * This exists so the recommender can be evaluated. The data is generated, not
 * real: any precision/recall computed from it measures the algorithm against
 * a known planted structure, not real customer behaviour.
 *
 *   node scripts/seedSynthetic.js          # seed
 *   node scripts/seedSynthetic.js --wipe   # delete seeded docs first
 */
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../models/User')
const Product = require('../models/Product')
const Order = require('../models/Order')

const SEED_TAG = 'synthetic-seed'

// Each category has its own vocabulary so TF-IDF has real signal to find.
const CATEGORIES = [
  {
    name: 'Pottery',
    adj: ['Terracotta', 'Glazed', 'Hand-thrown', 'Rustic', 'Painted'],
    noun: ['Pot', 'Vase', 'Planter', 'Bowl', 'Urn'],
    words: 'handmade clay terracotta kiln fired earthenware pottery glaze',
  },
  {
    name: 'Textiles',
    adj: ['Handwoven', 'Cotton', 'Silk', 'Block-printed', 'Embroidered'],
    noun: ['Saree', 'Dupatta', 'Shawl', 'Stole', 'Scarf'],
    words: 'handloom woven cotton silk weave thread fabric textile dye',
  },
  {
    name: 'Metalwork',
    adj: ['Brass', 'Copper', 'Bronze', 'Engraved', 'Polished'],
    noun: ['Lamp', 'Tray', 'Idol', 'Bell', 'Diya'],
    words: 'brass copper metal cast engraved polished traditional lamp',
  },
  {
    name: 'Woodcraft',
    adj: ['Teak', 'Rosewood', 'Carved', 'Inlaid', 'Lacquered'],
    noun: ['Box', 'Figurine', 'Frame', 'Stool', 'Chest'],
    words: 'wood carved teak rosewood grain polish artisan woodwork',
  },
  {
    name: 'Jewellery',
    adj: ['Silver', 'Beaded', 'Oxidised', 'Filigree', 'Tribal'],
    noun: ['Necklace', 'Earrings', 'Bangle', 'Pendant', 'Anklet'],
    words: 'silver bead stone ornament jewellery filigree tribal craft',
  },
  {
    name: 'Leather',
    adj: ['Tanned', 'Stitched', 'Embossed', 'Vegetable-dyed', 'Rugged'],
    noun: ['Wallet', 'Bag', 'Belt', 'Journal', 'Sandal'],
    words: 'leather tanned hide stitched embossed durable handcrafted',
  },
  {
    name: 'Spices',
    adj: ['Organic', 'Sun-dried', 'Stone-ground', 'Whole', 'Roasted'],
    noun: ['Turmeric', 'Chilli', 'Masala', 'Pepper', 'Cardamom'],
    words: 'spice organic aromatic ground harvest farm pure blend',
  },
  {
    name: 'Bamboo',
    adj: ['Woven', 'Split', 'Natural', 'Treated', 'Handcrafted'],
    noun: ['Basket', 'Mat', 'Tray', 'Lamp', 'Organiser'],
    words: 'bamboo cane woven eco natural sustainable basket craft',
  },
]

const STATES = [
  ['Telangana', 'Hyderabad'],
  ['Andhra Pradesh', 'Visakhapatnam'],
  ['Tamil Nadu', 'Madurai'],
  ['Gujarat', 'Kutch'],
  ['Maharashtra', 'Pune'],
  ['West Bengal', 'Kolkata'],
]

// Deterministic PRNG so re-running produces the same dataset.
let seed = 42
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))

const NOW = Date.now()
const DAY = 24 * 60 * 60 * 1000

async function main() {
  const wipe = process.argv.includes('--wipe')
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 20000 })
  console.log(`✅ connected: ${mongoose.connection.name}`)

  if (wipe) {
    const o = await Order.deleteMany({})
    const p = await Product.deleteMany({})
    const u = await User.deleteMany({ panCardName: SEED_TAG })
    console.log(
      `🧹 wiped ${o.deletedCount} orders, ${p.deletedCount} products, ${u.deletedCount} users`
    )
  }

  const existing = await Product.countDocuments()
  if (existing > 0 && !wipe) {
    console.log(`⚠ ${existing} products already exist. Re-run with --wipe to replace them.`)
    await mongoose.disconnect()
    return
  }

  const passwordHash = await bcrypt.hash('seeded-password-123', 10)

  // ---- sellers -------------------------------------------------------------
  const sellers = []
  for (let i = 0; i < 12; i++) {
    const [state, district] = STATES[i % STATES.length]
    sellers.push({
      name: `Seller ${i + 1}`,
      email: `seed.seller${i + 1}@example.com`,
      password: passwordHash,
      role: 'seller',
      businessName: `${pick(CATEGORIES).name} House ${i + 1}`,
      panCardName: SEED_TAG,
      state,
      district,
      isProfileComplete: true,
      isVerified: true,
    })
  }
  const sellerDocs = await User.insertMany(sellers)
  console.log(`👤 ${sellerDocs.length} sellers`)

  // ---- products ------------------------------------------------------------
  const products = []
  let n = 0
  for (const cat of CATEGORIES) {
    for (let i = 0; i < 25; i++) {
      const seller = sellerDocs[n % sellerDocs.length]
      const name = `${pick(cat.adj)} ${pick(cat.noun)} ${i + 1}`
      const sizes = [
        { size: 'S', stock: int(0, 20) },
        { size: 'M', stock: int(2, 30) },
        { size: 'L', stock: int(0, 15) },
      ]
      const totalStock = sizes.reduce((a, s) => a + s.stock, 0)
      products.push({
        seller: seller._id,
        name,
        description: `${name}. ${cat.words}. Sourced from ${seller.district}, ${seller.state}.`,
        category: cat.name,
        price: int(150, 6000),
        images: [`https://picsum.photos/seed/${encodeURIComponent(name)}/400`],
        sizes,
        totalStock,
        isActive: true,
        sku: `MSME-S${String(n).padStart(4, '0')}`,
        district: seller.district,
        state: seller.state,
        createdAt: new Date(NOW - int(60, 365) * DAY),
      })
      n++
    }
  }
  const productDocs = await Product.insertMany(products)
  console.log(`📦 ${productDocs.length} products`)

  const byCategory = {}
  for (const p of productDocs) (byCategory[p.category] ||= []).push(p)

  // ---- buyers --------------------------------------------------------------
  const buyers = []
  for (let i = 0; i < 150; i++) {
    buyers.push({
      name: `Buyer ${i + 1}`,
      email: `seed.buyer${i + 1}@example.com`,
      password: passwordHash,
      role: 'buyer',
      panCardName: SEED_TAG,
      isVerified: true,
    })
  }
  const buyerDocs = await User.insertMany(buyers)
  console.log(`👤 ${buyerDocs.length} buyers`)

  // ---- orders --------------------------------------------------------------
  // Each buyer has a favourite category. Baskets are drawn mostly from it,
  // which is the co-purchase structure the collaborative model should recover.
  const orders = []
  buyerDocs.forEach((buyer, bi) => {
    const favourite = CATEGORIES[bi % CATEGORIES.length].name
    // 55% of buyers order more than once, so they have history AND future
    // purchases either side of the evaluation's time split.
    const orderCount = rnd() < 0.55 ? int(2, 4) : 1

    for (let o = 0; o < orderCount; o++) {
      // Spread across 180 days; later orders for repeat buyers land later.
      const daysAgo = Math.max(
        1,
        Math.round(175 - (o / Math.max(1, orderCount)) * 150 - int(0, 20))
      )
      const pool = byCategory[favourite]
      const items = []
      const basketSize = int(2, 4)
      const chosen = new Set()
      for (let k = 0; k < basketSize; k++) {
        // 80% from the favourite category, 20% wander elsewhere.
        const fromPool = rnd() < 0.8 ? pool : byCategory[pick(CATEGORIES).name]
        const prod = pick(fromPool)
        if (chosen.has(String(prod._id))) continue
        chosen.add(String(prod._id))
        items.push({
          product: prod._id,
          quantity: int(1, 3),
          size: 'M',
          price: prod.price,
          seller: prod.seller,
        })
      }
      if (items.length < 2) continue

      const total = items.reduce((a, it) => a + it.price * it.quantity, 0)
      orders.push({
        buyer: buyer._id,
        products: items,
        shippingAddress: {
          name: buyer.name,
          street: '1 Market Road',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
          phone: '9999999999',
        },
        totalAmount: total + 50,
        shippingFee: 50,
        status: 'Delivered',
        paymentStatus: 'Completed',
        createdAt: new Date(NOW - daysAgo * DAY),
        updatedAt: new Date(NOW - daysAgo * DAY),
      })
    }
  })
  const orderDocs = await Order.insertMany(orders)
  console.log(`🧾 ${orderDocs.length} orders`)

  // ---- wishlists -----------------------------------------------------------
  let wishCount = 0
  for (let i = 0; i < buyerDocs.length; i += 3) {
    const favourite = CATEGORIES[i % CATEGORIES.length].name
    const picks = [pick(byCategory[favourite])._id, pick(byCategory[favourite])._id]
    await User.updateOne({ _id: buyerDocs[i]._id }, { $set: { wishlist: picks } })
    wishCount++
  }
  console.log(`❤️  ${wishCount} wishlists`)

  const multi = orderDocs.filter((o) => o.products.length > 1).length
  console.log(`\n--- signal check ---`)
  console.log(`  orders with 2+ products: ${multi}/${orderDocs.length}`)
  const repeat = {}
  orderDocs.forEach((o) => {
    repeat[o.buyer] = (repeat[o.buyer] || 0) + 1
  })
  console.log(`  buyers with 2+ orders:   ${Object.values(repeat).filter((c) => c > 1).length}`)

  await mongoose.disconnect()
  console.log('\n✅ seed complete')
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
