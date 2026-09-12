const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Ordered', 'Packed', 'Dispatched', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Ordered'
  },

  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending'
  },
  trackingId: {
    type: String
  },
  awbNumber: {
    type: String
  },
  logisticsProvider: {
    type: String,
    default: 'Shiprocket'
  }
}, {

  timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);
