const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get cart for a user
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }
    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Add item to cart (with stock validation)
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;

    // ✅ Stock validation
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const sizeEntry = product.sizes.find(s => s.size === size);
    const availableStock = sizeEntry ? sizeEntry.stock : 0;

    if (availableStock === 0) {
      return res.status(400).json({ success: false, message: `Size ${size} is out of stock` });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId && item.size === size);
    const currentQty = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
    const newQty = currentQty + quantity;

    if (newQty > availableStock) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${availableStock} units available for size ${size}. You already have ${currentQty} in cart.` 
      });
    }

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = newQty;
    } else {
      cart.items.push({ product: productId, quantity, size });
    }

    await cart.save();
    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update cart item (with stock validation)
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;

    // ✅ Stock validation
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const sizeEntry = product.sizes.find(s => s.size === size);
    const availableStock = sizeEntry ? sizeEntry.stock : 0;

    if (quantity > availableStock) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${availableStock} units available for size ${size}` 
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId && item.size === size);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = quantity;
      await cart.save();
    }

    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId || req.body?.productId;
    const size = req.params.size || req.body?.size;
    const cart = await Cart.findOne({ user: req.user.id });

    cart.items = cart.items.filter(item => !(item.product.toString() === productId && item.size === size));
    
    await cart.save();
    res.status(200).json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
