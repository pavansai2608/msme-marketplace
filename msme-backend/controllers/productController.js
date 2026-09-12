const Product = require('../models/Product')
const User = require('../models/User')
const recommender = require('../utils/recommender')

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const search = req.query.search || ''
    const category = req.query.category || 'All'
    const district = req.query.district || ''
    const state = req.query.state || ''

    console.log(
      `[API] getProducts received - Search: "${search}", Category: "${category}", District: "${district}"`
    )

    const query = {}

    if (search.trim() !== '') {
      // Find sellers whose businessName matches the search
      const sellers = await User.find({
        businessName: { $regex: search.trim(), $options: 'i' },
      }).select('_id')
      const sellerIds = sellers.map((s) => s._id)

      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { seller: { $in: sellerIds } },
      ]
    }

    if (category !== 'All') {
      query.category = { $regex: `^${category.trim()}$`, $options: 'i' }
    }

    if (district) {
      query.district = district
    }

    if (state) {
      query.state = state
    }

    console.log(`[API] Final Mongoose Query:`, JSON.stringify(query))

    // Check connection state
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) {
      console.warn(`[API Warning] Database not connected! State: ${mongoose.connection.readyState}`)
    }

    const products = await Product.find(query)
      .populate('seller', 'name businessName')
      .sort({ createdAt: -1 })

    console.log(
      `[API] Found ${products.length} products in "${mongoose.connection.name}.${Product.collection.name}"`
    )

    res.status(200).json({ success: true, count: products.length, data: products })
  } catch (err) {
    console.error(`[API Error] getProducts:`, err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Get all unique categories from products in DB
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category')
    // Remove nulls/undefined, ensure uniqueness, and sort
    const uniqueCategories = [...new Set(categories.filter(Boolean))].sort()

    console.log(`[DB] Found ${uniqueCategories.length} categories:`, uniqueCategories)
    res.status(200).json({ success: true, data: uniqueCategories })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Seller
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    // Make sure user is owner
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    const updateData = { ...req.body }
    delete updateData.seller // Cannot change owner

    Object.assign(product, updateData)
    await product.save()

    res.status(200).json({ success: true, data: product })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Seller
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    // Make sure user is owner (with null check for safety)
    if (!product.seller || product.seller.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: 'Not authorized to delete this product' })
    }

    await product.deleteOne()

    res.status(200).json({ success: true, data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    console.log(`[API] getProduct looking for ID: ${req.params.id}`)
    const product = await Product.findById(req.params.id).populate('seller', 'name businessName')
    if (!product) {
      console.log(`[API] Product NOT found: ${req.params.id}`)
      return res.status(404).json({ success: false, message: 'Product not found' })
    }
    console.log(`[API] Found product: ${product.name}`)
    res.status(200).json({ success: true, data: product })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// @desc    Create product
// @route   POST /api/products
// @access  Private/Seller
exports.createProduct = async (req, res) => {
  try {
    req.body.seller = req.user.id

    // Attach district and state from user profile
    const user = await User.findById(req.user.id)
    if (user) {
      req.body.district = user.district
      req.body.state = user.state
    }

    const product = await Product.create(req.body)
    res.status(201).json({ success: true, data: product })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
}

// @desc    Get seller products
// @route   GET /api/products/seller/me
// @access  Private/Seller
exports.getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id
    console.log(`[API] Fetching products for Seller ID: ${sellerId}`)

    const products = await Product.find({ seller: sellerId })
    console.log(`[API] Found ${products.length} products for seller ${sellerId}`)

    res.status(200).json({ success: true, count: products.length, data: products })
  } catch (err) {
    console.error(`[API Error] getSellerProducts:`, err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// Fetches products by id and restores the recommender's ordering, which
// Mongo's $in does not preserve. Inactive/out-of-stock items are dropped.
const hydrateInOrder = async (ids) => {
  if (!ids || ids.length === 0) return []
  const products = await Product.find({ _id: { $in: ids }, isActive: true }).populate(
    'seller',
    'name businessName'
  )
  const byId = new Map(products.map((p) => [p._id.toString(), p]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

const newestFirst = (limit, excludeId) => {
  const query = { isActive: true }
  if (excludeId) query._id = { $ne: excludeId }
  return Product.find(query)
    .populate('seller', 'name businessName')
    .sort({ createdAt: -1 })
    .limit(limit)
}

// @desc    Products similar to a given product
// @route   GET /api/products/:id/similar
// @access  Public
exports.getSimilarProducts = async (req, res) => {
  const k = Math.min(parseInt(req.query.k, 10) || 10, 50)
  try {
    const ids = await recommender.similarToProduct(req.params.id, k)

    let data = []
    let source = 'recommender'

    if (ids) {
      data = await hydrateInOrder(ids)
    }

    // No recommender, or it returned nothing usable.
    if (!data.length) {
      data = await newestFirst(k, req.params.id)
      source = 'fallback'
    }

    res.status(200).json({ success: true, source, count: data.length, data })
  } catch {
    // Never fail the page because recommendations failed.
    try {
      const data = await newestFirst(k, req.params.id)
      res.status(200).json({ success: true, source: 'fallback', count: data.length, data })
    } catch (inner) {
      res.status(500).json({ success: false, message: inner.message })
    }
  }
}

// @desc    Personalised recommendations (falls back to trending, then newest)
// @route   GET /api/products/recommended
// @access  Public (personalised when authenticated)
exports.getRecommendedProducts = async (req, res) => {
  const k = Math.min(parseInt(req.query.k, 10) || 10, 50)
  try {
    const userId = req.user?.id
    const ids = userId
      ? await recommender.recommendForUser(userId, k)
      : await recommender.trending(k)

    let data = []
    let source = 'recommender'

    if (ids) {
      data = await hydrateInOrder(ids)
    }

    if (!data.length) {
      data = await newestFirst(k)
      source = 'fallback'
    }

    res.status(200).json({ success: true, source, count: data.length, data })
  } catch {
    try {
      const data = await newestFirst(k)
      res.status(200).json({ success: true, source: 'fallback', count: data.length, data })
    } catch (inner) {
      res.status(500).json({ success: false, message: inner.message })
    }
  }
}
