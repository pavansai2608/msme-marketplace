const express = require('express');
const router = express.Router();
const { 
  getProducts, 
  getProduct, 
  createProduct, 
  getSellerProducts,
  updateProduct,
  deleteProduct,
  getCategories
} = require('../controllers/productController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public routes
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);

// Private routes
router.post('/', verifyToken, requireRole('seller', 'admin'), createProduct);
router.get('/seller/me', verifyToken, requireRole('seller', 'admin'), getSellerProducts);
router.put('/:id', verifyToken, requireRole('seller', 'admin'), updateProduct);
router.delete('/:id', verifyToken, requireRole('seller', 'admin'), deleteProduct);

module.exports = router;
