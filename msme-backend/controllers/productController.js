const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const search = req.query.search || '';
    const category = req.query.category || 'All';
    const district = req.query.district || '';
    const state = req.query.state || '';
    
    console.log(`[API] getProducts received - Search: "${search}", Category: "${category}", District: "${district}"`);
    
    let query = {};

    if (search.trim() !== '') {
      // Find sellers whose businessName matches the search
      const sellers = await User.find({
        businessName: { $regex: search.trim(), $options: 'i' }
      }).select('_id');
      const sellerIds = sellers.map(s => s._id);

      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { seller: { $in: sellerIds } }
      ];
    }

    if (category !== 'All') {
      query.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    if (district) {
      query.district = district;
    }

    if (state) {
      query.state = state;
    }


    console.log(`[API] Final Mongoose Query:`, JSON.stringify(query));
    
    // Check connection state
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.warn(`[API Warning] Database not connected! State: ${mongoose.connection.readyState}`);
    }

    const products = await Product.find(query)
      .populate('seller', 'name businessName')
      .sort({ createdAt: -1 });
      
    console.log(`[API] Found ${products.length} products in "${mongoose.connection.name}.${Product.collection.name}"`);
    
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    console.error(`[API Error] getProducts:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all unique categories from products in DB
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    // Remove nulls/undefined, ensure uniqueness, and sort
    const uniqueCategories = [...new Set(categories.filter(Boolean))].sort();
    
    console.log(`[DB] Found ${uniqueCategories.length} categories:`, uniqueCategories);
    res.status(200).json({ success: true, data: uniqueCategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Seller
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Make sure user is owner
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const updateData = { ...req.body };
    delete updateData.seller; // Cannot change owner
    
    Object.assign(product, updateData);
    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Seller
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Make sure user is owner (with null check for safety)
    if (!product.seller || product.seller.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await product.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    console.log(`[API] getProduct looking for ID: ${req.params.id}`);
    const product = await Product.findById(req.params.id).populate('seller', 'name businessName');
    if (!product) {
      console.log(`[API] Product NOT found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    console.log(`[API] Found product: ${product.name}`);
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Seller
exports.createProduct = async (req, res) => {
  try {
    req.body.seller = req.user.id;
    
    // Attach district and state from user profile
    const user = await User.findById(req.user.id);
    if (user) {
      req.body.district = user.district;
      req.body.state = user.state;
    }

    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// @desc    Get seller products
// @route   GET /api/products/seller/me
// @access  Private/Seller
exports.getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    console.log(`[API] Fetching products for Seller ID: ${sellerId}`);
    
    const products = await Product.find({ seller: sellerId });
    console.log(`[API] Found ${products.length} products for seller ${sellerId}`);
    
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    console.error(`[API Error] getSellerProducts:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update user profile (onboarding)
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      businessName: req.body.businessName,
      panCardName: req.body.panCardName,
      district: req.body.district,
      state: req.body.state,
      isProfileComplete: true
    };


    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
