const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  images: [{
    type: String,
    required: [true, 'Please add at least one image URL']
  }],
  category: {
    type: String,
    required: [true, 'Please add a category']
  },
  sizes: [{
    size: {
      type: String,
      required: true
    },
    stock: {
      type: Number,
      required: true,
      default: 0
    }
  }],
  totalStock: {
    type: Number,
    default: 0
  },
  district: { type: String, index: true },
  state: { type: String, index: true },
  sku: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  lowStockThreshold: { type: Number, default: 5 },
  autoDelist: { type: Boolean, default: true },
  rawMaterials: [{
    name: String,
    quantityPerUnit: Number,
    stock: Number
  }],
  rating: {


    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total stock and auto-delist if needed
ProductSchema.pre('save', function(next) {
  this.totalStock = this.sizes.reduce((acc, curr) => acc + curr.stock, 0);
  
  if (this.autoDelist && this.totalStock === 0) {
    this.isActive = false;
  }
  
  // Generate SKU if missing
  if (!this.sku) {
    this.sku = 'MSME-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  next();
});


// Indices for search and performance
ProductSchema.index({ name: 'text', category: 'text', description: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ seller: 1 });
ProductSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', ProductSchema, 'products');
