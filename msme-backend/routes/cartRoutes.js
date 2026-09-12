const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart 
} = require('../controllers/cartController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.delete('/remove', removeFromCart);
router.delete('/:productId/:size', removeFromCart);

module.exports = router;
