const express = require('express')
const router = express.Router()
const {
  getProducts,
  getProduct,
  createProduct,
  getSellerProducts,
  updateProduct,
  deleteProduct,
  getCategories,
  getSimilarProducts,
  getRecommendedProducts,
} = require('../controllers/productController')
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')

// Public routes. Literal paths must precede '/:id' or they are swallowed by it.
router.get('/categories', getCategories)
router.get('/recommended', optionalAuth, getRecommendedProducts)
router.get('/', getProducts)
router.get('/:id/similar', getSimilarProducts)
router.get('/:id', getProduct)

// Private routes
router.post('/', verifyToken, requireRole('seller', 'admin'), createProduct)
router.get('/seller/me', verifyToken, requireRole('seller', 'admin'), getSellerProducts)
router.put('/:id', verifyToken, requireRole('seller', 'admin'), updateProduct)
router.delete('/:id', verifyToken, requireRole('seller', 'admin'), deleteProduct)

module.exports = router
