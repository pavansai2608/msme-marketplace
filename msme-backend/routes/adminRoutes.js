const express = require('express')
const router = express.Router()
const {
  getStats,
  getUsers,
  updateUserStatus,
  getOrders,
} = require('../controllers/adminController')
const { verifyToken } = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')

// Applied to the whole router rather than per-route, so a handler added later
// cannot accidentally be left unguarded.
router.use(verifyToken, requireRole('admin'))

router.get('/stats', getStats)
router.get('/users', getUsers)
router.patch('/users/:id/status', updateUserStatus)
router.get('/orders', getOrders)

module.exports = router
