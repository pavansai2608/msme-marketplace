const User = require('../models/User')
const Product = require('../models/Product')

exports.getWishlist = async (req, res) => {
  try {
    const start = Date.now();
    console.log(`[API] getWishlist for user: ${req.user?.id}`);
    
    const user = await User.findById(req.user.id)
      .select('wishlist')
      .populate({
        path: 'wishlist',
        select: 'name price images category stock description sizes seller rating',
        populate: { path: 'seller', select: 'businessName' }
      })
      .lean();
      
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const wishlist = user.wishlist || [];
    console.log(`[API] getWishlist completed in ${Date.now() - start}ms. Found ${wishlist.length} items`);
    res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body
    const user = await User.findById(req.user.id)
    
    // Check if moving to/from wishlist
    const isWished = user.wishlist.includes(productId)
    
    if (isWished) {
      user.wishlist = user.wishlist.filter(id => id.toString() !== productId.toString())
    } else {
      user.wishlist.push(productId)
    }
    
    await user.save()
    res.json({ success: true, isWished: !isWished, data: user.wishlist })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.id)
    await user.save()
    res.json({ success: true, data: user.wishlist })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.addAddress = async (req, res) => {
  try {
    const { name, phone, pincode, locality, street, city, state, landmark, altPhone, type } = req.body
    const user = await User.findById(req.user.id)
    
    user.savedAddresses.push({
      name, phone, pincode, locality, street, city, state, landmark, altPhone, type
    })
    
    await user.save()
    res.json({ success: true, data: user.savedAddresses })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    res.json({ success: true, data: user.savedAddresses })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const addressId = req.params.id
    
    const addressIndex = user.savedAddresses.findIndex(addr => addr._id.toString() === addressId)
    if (addressIndex === -1) {
      return res.status(404).json({ success: false, message: 'Address not found' })
    }
    
    Object.assign(user.savedAddresses[addressIndex], req.body)
    await user.save()
    
    res.json({ success: true, data: user.savedAddresses })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    console.log(`🗑️ Attempting to delete address: ${req.params.id}`)
    console.log(`Current address IDs:`, user.savedAddresses.map(a => a._id.toString()))
    
    const initialCount = user.savedAddresses.length
    user.savedAddresses = user.savedAddresses.filter(addr => addr._id.toString() !== req.params.id)
    
    if (user.savedAddresses.length === initialCount) {
      console.log(`⚠️ No address found with ID: ${req.params.id}`)
    } else {
      console.log(`✅ Address deleted. New count: ${user.savedAddresses.length}`)
    }
    
    await user.save()
    res.json({ success: true, data: user.savedAddresses })
  } catch (err) {
    console.log(`🔥 DELETE FAIL:`, err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}
