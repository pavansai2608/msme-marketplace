const express = require('express')
const router = express.Router()
const { 
  getWishlist, 
  toggleWishlist, 
  removeFromWishlist, 
  addAddress, 
  getAddresses,
  updateAddress,
  deleteAddress
} = require('../controllers/userController')
const { verifyToken } = require('../middleware/authMiddleware')

router.use(verifyToken)

router.get('/wishlist', getWishlist)
router.post('/wishlist/toggle', toggleWishlist)
router.delete('/wishlist/:id', removeFromWishlist)

router.get('/addresses', getAddresses)
router.post('/addresses', addAddress)
router.put('/addresses/:id', updateAddress)
router.delete('/addresses/:id', deleteAddress)

module.exports = router
