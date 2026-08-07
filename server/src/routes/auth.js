const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { login } = require('../controllers/authController');

router.post('/login', authenticate, login);

module.exports = router;
