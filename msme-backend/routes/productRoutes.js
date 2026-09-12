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

// Public routes
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);

// Private routes
router.post('/', verifyToken, createProduct);
router.get('/seller/me', verifyToken, getSellerProducts);
router.put('/:id', verifyToken, updateProduct);
router.delete('/:id', verifyToken, deleteProduct);

module.exports = router;
