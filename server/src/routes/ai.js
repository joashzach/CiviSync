const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { analyzeImage } = require('../controllers/aiController');

router.post('/analyze', authenticate, analyzeImage);

module.exports = router;
