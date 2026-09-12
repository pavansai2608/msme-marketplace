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

router.get('/my-orders', verifyToken, getMyOrders);
router.get('/seller', verifyToken, getSellerOrders);
router.get('/seller/stats', verifyToken, getSellerStats);
router.get('/seller/forecast', verifyToken, getSellerForecast);
router.get('/track/:trackingId', verifyToken, trackOrder);
router.put('/:id/status', verifyToken, updateOrderStatus);
router.put('/:id/assign-carrier', verifyToken, assignCarrier);
router.post('/:id/generate-waybill', verifyToken, generateWaybill);

router.post('/checkout', verifyToken, placeOrder);

module.exports = router;
