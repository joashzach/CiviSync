const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getStats, getMyStats } = require('../controllers/statsController');

// Public — used by landing page
router.get('/', getStats);

// Authenticated — citizen-specific counts
router.get('/mine', authenticate, getMyStats);

module.exports = router;
