const express = require('express');
const router = express.Router();
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { getStats, getMyStats } = require('../controllers/statsController');

// Public or official-scoped stats
router.get('/', optionalAuthenticate, getStats);

// Authenticated — citizen-specific counts
router.get('/mine', authenticate, getMyStats);

module.exports = router;
