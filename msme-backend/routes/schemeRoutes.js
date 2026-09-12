const express = require('express');
const router = express.Router();
const { getSchemes } = require('../controllers/schemeController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getSchemes);

module.exports = router;
