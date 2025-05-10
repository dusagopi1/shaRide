const express = require('express');
const userController = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateUser, userController.getProfile);

// Update user profile
router.put('/profile', authenticateUser, userController.updateProfile);

module.exports = router;
