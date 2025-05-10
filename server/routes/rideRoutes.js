const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { authenticateUser } = require('../middleware/auth');

// Create a new ride (Driver)
router.post('/', authenticateUser, rideController.createRide);

// Join an existing ride (Rider)
router.post('/:rideId/join', authenticateUser, rideController.joinRide);

// Cancel a ride
router.post('/:rideId/cancel', authenticateUser, rideController.cancelRide);

// Finish a ride
router.put('/:rideId/finish', authenticateUser, rideController.finishRide);

// Submit rating for a ride
router.post('/:rideId/rate', authenticateUser, rideController.rateRide);

// Get user's rides (both as driver and rider) - Must come BEFORE /:rideId route
router.get('/user', authenticateUser, rideController.getUserRides);

// Get available rides (Rider)
router.get('/', authenticateUser, rideController.getAvailableRides);

// Get specific ride details - Must come AFTER /user route
router.get('/:rideId', authenticateUser, rideController.getRide);

module.exports = router;