const Ride = require('../models/Ride');

exports.getAvailableRides = async (req, res) => {
    try {
      const rides = await Ride.find({ status: 'waiting' })
        .populate('driverId', 'username');
      res.status(200).json(rides);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch available rides' });
    }
  };
exports.createRide = async (req, res) => {
  try {
    // Extract all data from request body
    const { 
      pickup, 
      drop, 
      fare, 
      departureTime, 
      vehicleInfo, 
      availableSeats,
      stops 
    } = req.body;
    
    // Validate required fields
    if (!pickup || !drop) {
      return res.status(400).json({ error: 'Pickup and drop locations are required' });
    }
    
    // Create ride object with all fields
    const ride = new Ride({
      driverId: req.userId,
      pickup,
      drop,
      fare: fare || undefined,
      departureTime: departureTime || undefined,
      vehicleInfo: vehicleInfo || undefined,
      availableSeats: availableSeats || 1,
      stops: stops || []
    });
    
    await ride.save();
    res.status(201).json(ride);
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({ error: 'Failed to create ride', details: error.message });
  }
};
exports.getRide = async (req, res) => {
    try {
      // CORRECT: Find by ride ID (_id) and populate with username and phone
      const ride = await Ride.findById(req.params.rideId) // ← Use rideId not driverId
        .populate('driverId', 'username phone')
        .populate('matchedUserId', 'username phone');
  
      if (!ride) {
        return res.status(404).json({ error: 'Ride not found' });
      }
      
      // Log the full populated ride to see driver and rider details
      console.log('Full ride details:', JSON.stringify(ride, null, 2));
      
      // Extract driver phone directly from the populated document
      // Debug the driver User document to see what's available
      console.log('===== DEBUG OUTPUT =====');
      console.log('Full driver object:', ride.driverId);
      console.log('Driver _id:', ride.driverId?._id);
      console.log('Driver username:', ride.driverId?.username);
      console.log('Driver phone property:', ride.driverId?.phone);
      console.log('Driver schema keys:', Object.keys(ride.driverId || {}));
      
      // Extract rider data for debugging too
      console.log('Full rider object:', ride.matchedUserId);
      console.log('Rider _id:', ride.matchedUserId?._id);
      console.log('Rider username:', ride.matchedUserId?.username);
      console.log('Rider phone property:', ride.matchedUserId?.phone);
      console.log('Rider schema keys:', Object.keys(ride.matchedUserId || {}));
      console.log('===== END DEBUG =====');
      
      // Use a more strict approach to extract phone, looking at _doc if needed
      const driverPhone = ride.driverId?.phone || 
                         (ride.driverId?._doc?.phone) || 
                         'Not available';
      console.log('Driver phone from DB:', driverPhone);
      
      // Extract rider phone with same approach
      const riderPhone = ride.matchedUserId?.phone || 
                       (ride.matchedUserId?._doc?.phone) || 
                       'Not available';
      console.log('Rider phone from DB:', riderPhone);
      
      // Format the response to include all necessary information
      const response = {
        id: ride._id,
        driver: ride.driverId.username,
        pickup: ride.pickup,
        drop: ride.drop,
        status: ride.status,
        // Add phone numbers if available
        driverPhone: driverPhone,
        riderPhone: riderPhone,
        rider: ride.matchedUserId?.username || ''  
      };
      
      console.log('Sending ride details with phone numbers:', response);
      res.json(response);
  
    } catch (error) {
      console.error('Get ride error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch ride',
        details: error.message 
      });
    }
  };
exports.joinRide = async (req, res) => {
    try {
      // 1. Get the ride ID from URL parameter
      const rideId = req.params.rideId; // From /api/rides/:rideId/join
      
      // 2. Find and update the ride by its ID
      const ride = await Ride.findOneAndUpdate(
        { 
          _id: rideId,          // Using the ride ID from URL
          status: 'waiting'      // Only match waiting rides
        },
        { 
          status: 'matched',
          matchedUserId: req.userId, // Set the joining user
          updatedAt: new Date() 
        },
        { new: true } // Return the updated document
      )
      .populate('driverId', 'username phone')
      .populate('matchedUserId', 'username phone');
      
      // 3. Handle response
      if (!ride) {
        return res.status(400).json({ error: 'Ride not available' });
      }
      
      // Extract phone numbers for both users
      const driverPhone = ride.driverId?.phone || 'Not available';
      const riderPhone = ride.matchedUserId?.phone || 'Not available';
      
      console.log('Joined ride with phone numbers - Driver:', driverPhone, 'Rider:', riderPhone);
      
      // Include complete user details in response
      res.json({ 
        message: 'Successfully joined ride', 
        ride,
        driverName: ride.driverId?.username,
        riderName: ride.matchedUserId?.username,
        driverPhone,
        riderPhone
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to join ride' });
    }
  };

/**
 * Get all rides for the authenticated user (as driver or rider)
 */
exports.getUserRides = async (req, res) => {
  try {
    const userId = req.userId;
    const statusFilter = req.query.status;
    
    // Create base query looking for rides where user is driver or rider
    let query = {
      $or: [
        { driverId: userId },
        { matchedUserId: userId }
      ]
    };
    
    // Add status filter if provided and valid
    if (statusFilter && ['waiting', 'matched', 'confirmed', 'completed'].includes(statusFilter)) {
      query.status = statusFilter;
    }
    
    // Find rides matching the query and populate user details
    const rides = await Ride.find(query)
      .populate('driverId', 'username phone')
      .populate('matchedUserId', 'username phone')
      .sort({ createdAt: -1 }); // Most recent first
    
    // Transform data for the frontend
    const formattedRides = rides.map(ride => {
      // Extract basic ride details
      const rideData = {
        _id: ride._id,
        pickup: ride.pickup,
        drop: ride.drop,
        status: ride.status,
        createdAt: ride.createdAt,
        driver: ride.driverId?.username || 'Unknown',
        rider: ride.matchedUserId?.username || null,
        driverPhone: ride.driverId?.phone || 'Not available',
        riderPhone: ride.matchedUserId?.phone || 'Not available'
      };
      
      return rideData;
    });
    
    res.json(formattedRides);
  } catch (error) {
    console.error('Error getting user rides:', error);
    res.status(500).json({ error: 'Failed to retrieve rides' });
  }
};

/**
 * Cancel a ride (can be done by either driver or rider)
 */
exports.cancelRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.userId;
    
    // Find the ride first
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if user is authorized to cancel this ride
    const isDriver = ride.driverId.toString() === userId;
    const isRider = ride.matchedUserId && ride.matchedUserId.toString() === userId;
    
    if (!isDriver && !isRider) {
      return res.status(403).json({ error: 'You are not authorized to cancel this ride' });
    }
    
    // Cannot cancel completed rides
    if (ride.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed ride' });
    }
    
    // Different cancel behavior based on role and ride status
    let updateData = {};
    
    if (isDriver) {
      // Driver can completely cancel the ride
      updateData = { status: 'cancelled' };
    } else if (isRider && ['matched', 'confirmed'].includes(ride.status)) {
      // Rider can drop out, which resets the ride to waiting status
      updateData = { 
        status: 'waiting',
        matchedUserId: null
      };
    }
    
    // Update the ride
    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      updateData,
      { new: true }
    );
    
    res.json({ 
      message: 'Ride cancelled successfully',
      ride: updatedRide
    });
    
  } catch (error) {
    console.error('Error cancelling ride:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
};

/**
 * Finish a ride (can be done by driver or rider)
 */
exports.finishRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.userId;
    
    // Find the ride first
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if user is authorized to finish this ride
    const isDriver = ride.driverId.toString() === userId;
    const isRider = ride.matchedUserId && ride.matchedUserId.toString() === userId;
    
    if (!isDriver && !isRider) {
      return res.status(403).json({ error: 'You are not authorized to finish this ride' });
    }
    
    // Can only finish active rides
    if (ride.status !== 'active' && ride.status !== 'matched') {
      return res.status(400).json({ 
        error: `Cannot finish a ride with status: ${ride.status}. Ride must be active.` 
      });
    }
    
    // Update the ride status to completed
    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      { 
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );
    
    // Notify other user via socket if possible
    if (req.io) {
      req.io.to(rideId).emit('ride-completed', {
        rideId,
        message: 'The ride has been completed',
        completedBy: isDriver ? 'driver' : 'rider'
      });
    }
    
    res.json({ 
      message: 'Ride completed successfully',
      ride: updatedRide
    });
    
  } catch (error) {
    console.error('Error finishing ride:', error);
    res.status(500).json({ error: 'Failed to finish ride' });
  }
};

/**
 * Submit rating for a completed ride
 */
exports.rateRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.userId;
    const { rating, comment, userRole } = req.body;
    
    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Find the ride first
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if user is authorized to rate this ride
    const isDriver = ride.driverId.toString() === userId;
    const isRider = ride.matchedUserId && ride.matchedUserId.toString() === userId;
    
    if (!isDriver && !isRider) {
      return res.status(403).json({ error: 'You are not authorized to rate this ride' });
    }
    
    // Can only rate completed rides
    if (ride.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed rides' });
    }
    
    // Check if this user has already rated
    if ((isDriver && ride.driverRating) || (isRider && ride.riderRating)) {
      return res.status(400).json({ error: 'You have already rated this ride' });
    }
    
    // Prepare the update based on who is rating
    let updateData = {};
    
    if (isDriver) {
      // Driver is rating the rider
      updateData = { 
        riderRating: rating,
        riderRatingComment: comment || '',
        riderRatedAt: new Date()
      };
    } else {
      // Rider is rating the driver
      updateData = { 
        driverRating: rating,
        driverRatingComment: comment || '',
        driverRatedAt: new Date()
      };
    }
    
    // Update the ride with the rating
    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      updateData,
      { new: true }
    );
    
    // Notify other user via socket if possible
    if (req.io) {
      req.io.to(rideId).emit('ride-rated', {
        rideId,
        rating,
        ratedBy: isDriver ? 'driver' : 'rider'
      });
    }
    
    res.json({ 
      message: 'Rating submitted successfully',
      ride: updatedRide
    });
    
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};