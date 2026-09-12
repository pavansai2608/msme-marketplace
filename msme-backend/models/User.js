const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, select: false },
  googleId: { type: String, index: true },
  avatar: { type: String },
  role: { type: String, enum: ['seller', 'buyer', 'admin'], default: 'buyer' },
  
  // Seller specific fields
  businessName: { type: String, trim: true },
  panCardName: { type: String, trim: true },
  district: { type: String, trim: true },
  state: { type: String, trim: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  isProfileComplete: { type: Boolean, default: false },

  
  isVerified: { type: Boolean, default: false },
  
  // Buyer specific fields
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  savedAddresses: [{
    name: String,
    phone: String,
    pincode: String,
    locality: String,
    street: String,
    city: String,
    state: String,
    landmark: String,
    altPhone: String,
    type: { type: String, default: 'Home' },
    isDefault: { type: Boolean, default: false }
  }],
  
  lastLogin: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true })

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password)
}

module.exports = mongoose.model('User', UserSchema)
