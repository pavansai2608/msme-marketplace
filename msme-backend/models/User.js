const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: {
      type: String,
      select: false,
      minlength: [8, 'Password must be at least 8 characters'],
    },
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
      lng: { type: Number },
    },
    isProfileComplete: { type: Boolean, default: false },

    isVerified: { type: Boolean, default: false },

    // Set false by an admin to suspend the account. Checked on every
    // authenticated request, so suspension takes effect on the next call
    // rather than when the current access token happens to expire.
    isActive: { type: Boolean, default: true },

    // Buyer specific fields
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    savedAddresses: [
      {
        name: String,
        // Shape enforced here so the API is the authority, not the form. The
        // client mirrors these exact rules in src/lib/schemas.js.
        phone: {
          type: String,
          match: [/^\d{10}$/, 'Phone must be exactly 10 digits'],
        },
        pincode: {
          type: String,
          match: [/^\d{6}$/, 'Pincode must be exactly 6 digits'],
        },
        locality: String,
        street: String,
        city: String,
        state: String,
        landmark: String,
        // Optional, but held to the same shape when supplied. The regex allows
        // '' because an untouched optional input posts an empty string.
        altPhone: {
          type: String,
          match: [/^(\d{10})?$/, 'Phone must be exactly 10 digits'],
        },
        type: { type: String, default: 'Home' },
        isDefault: { type: Boolean, default: false },
      },
    ],

    lastLogin: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Refresh token rotation. Only the hash of the CURRENT refresh token is
    // stored; presenting a valid-but-different one means an old token was
    // replayed, which revokes the whole family.
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpire: { type: Date, select: false },

    // Bumped whenever the token family is revoked. Access tokens carry this
    // value, so already-issued 15-minute access tokens die immediately too
    // rather than lingering until they expire.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
)

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password)
}

module.exports = mongoose.model('User', UserSchema)
