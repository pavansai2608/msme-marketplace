const express = require('express');
const router = express.Router();
const { 
  getSellerOrders, 
  updateOrderStatus, 
  getSellerStats,
  getSellerForecast,
  generateWaybill,
  getMyOrders,
  assignCarrier,
  trackOrder,
} = require('../controllers/orderController');

const { placeOrder } = require('../controllers/checkoutController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const sellerOnly = [verifyToken, requireRole('seller', 'admin')];

router.get('/my-orders', verifyToken, getMyOrders);

// Seller-scoped reporting
router.get('/seller', sellerOnly, getSellerOrders);
router.get('/seller/stats', sellerOnly, getSellerStats);
router.get('/seller/forecast', sellerOnly, getSellerForecast);

// Per-order operations. These verify per-order ownership inside the controller,
// so they stay available to the buyer where that is the intent (trackOrder).
router.get('/track/:trackingId', verifyToken, trackOrder);
router.put('/:id/status', sellerOnly, updateOrderStatus);
router.put('/:id/assign-carrier', sellerOnly, assignCarrier);
router.post('/:id/generate-waybill', sellerOnly, generateWaybill);

router.post('/checkout', verifyToken, placeOrder);

module.exports = router;
