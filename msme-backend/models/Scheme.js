const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  benefit: {
    type: String,
    required: true
  },
  eligible: {
    type: String,
    required: true
  },
  district: {
    type: String,
    default: 'All India'
  },
  category: {
    type: String,
    default: 'All Categories'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Add indexes for faster filtering
schemeSchema.index({ district: 1, category: 1, isActive: 1 });
schemeSchema.index({ title: 'text', benefit: 'text' });

module.exports = mongoose.model('Scheme', schemeSchema, 'schemes');
