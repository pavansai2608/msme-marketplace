const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Product = require('../models/Product')

exports.placeOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body

    // The order stores its own copy of the address, so it has to be checked
    // here too - a checkout never touches savedAddresses and would otherwise
    // skip the schema validators entirely. Same rules as models/User.js and
    // the client's src/lib/schemas.js.
    const addressErrors = []
    for (const field of ['name', 'phone', 'street', 'city', 'state', 'pincode']) {
      if (!String(shippingAddress?.[field] || '').trim()) addressErrors.push(`${field} is required`)
    }
    if (shippingAddress?.pincode && !/^\d{6}$/.test(shippingAddress.pincode)) {
      addressErrors.push('Pincode must be exactly 6 digits')
    }
    if (shippingAddress?.phone && !/^\d{10}$/.test(shippingAddress.phone)) {
      addressErrors.push('Phone must be exactly 10 digits')
    }
    if (addressErrors.length) {
      return res.status(400).json({ success: false, message: addressErrors.join(', ') })
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product')

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' })
    }

    const orderProducts = []
    let totalAmount = 0

    for (const item of cart.items) {
      // Re-fetch product to get REAL TIME price (Avoid ₹0 issues)
      const freshProduct = await Product.findById(item.product._id)
      if (!freshProduct) continue

      const itemPrice = freshProduct.price || 5999 // Fallback to avoid 0
      orderProducts.push({
        product: freshProduct._id,
        quantity: item.quantity,
        size: item.size,
        price: itemPrice,
        seller: freshProduct.seller,
      })
      totalAmount += itemPrice * item.quantity
    }

    // Real-Time Logistics (Shiprocket) Integration
    const shiprocket = require('../utils/shiprocket')
    let shippingFee = 50 // Default
    try {
      // Assuming seller pickup pincode is 500001 (Hyderabad) for demo
      const sResult = await shiprocket.checkServiceability('500001', shippingAddress.pincode, 0.5)
      if (sResult.success && sResult.data?.available_courier_companies?.[0]) {
        shippingFee = sResult.data.available_courier_companies[0].rate
      }
    } catch (_sErr) {
      console.error('Shiprocket Rate Fetching Failed, Using fallback')
    }

    const finalAmount = totalAmount + shippingFee

    const order = await Order.create({
      buyer: req.user.id,
      products: orderProducts,
      shippingAddress,
      totalAmount: finalAmount,
      shippingFee,
      status: 'Ordered',
      paymentStatus: 'Completed',
    })

    // Reduce stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
      const sizeIndex = product.sizes.findIndex((s) => s.size === item.size)
      if (sizeIndex > -1) {
        product.sizes[sizeIndex].stock -= item.quantity
        await product.save()
      }
    }

    // Clear cart
    cart.items = []
    await cart.save()

    res.status(201).json({ success: true, data: order })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
