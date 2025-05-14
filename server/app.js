const express = require('express');
const http = require('http');  // Must be imported first
const socketIO = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env file in development only
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client/public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/public/index.html'));
  });

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle ride-joined event
  socket.on('ride-joined', async (data, callback) => {
    console.log('Server received ride-joined event with data:', JSON.stringify(data, null, 2));
    
    try {
      // Get ride details from database
      const Ride = require('./models/Ride');
      const User = require('./models/User');
      
      const ride = await Ride.findById(data.rideId);
      if (!ride) {
        throw new Error('Ride not found');
      }
      
      // Get driver details
      const driver = await User.findById(ride.driverId).select('username');
      
      // Always use the username sent with the event first
      let joinerDetails = {
        username: data.username || 'Anonymous User'
      };
      
      console.log(`Username from request: "${data.username}", joinerDetails: ${JSON.stringify(joinerDetails)}`);
      
      // If we have a userId, try to get full user details as fallback
      if (data.userId) {
        try {
          const joiner = await User.findById(data.userId).select('username');
          if (joiner && joiner.username && !data.username) {
            // Only use database name if we didn't get a name from the request
            joinerDetails.username = joiner.username;
            console.log(`Found username from database: ${joiner.username}`);
          }
        } catch (err) {
          console.error('Error fetching joiner details:', err);
        }
      }
      
      // Use the most reliable source of username (prioritize direct info)
      let bestUsername = 'Guest Rider';
      
      // Check the newly added userInfo object first
      if (data.userInfo && data.userInfo.username) {
        bestUsername = data.userInfo.username;
        console.log('Using username from userInfo object:', bestUsername);
      }
      // Then check the direct username property
      else if (data.username && data.username !== 'Anonymous User') {
        bestUsername = data.username;
        console.log('Using username from direct property:', bestUsername);
      }
      // Fall back to DB lookup result
      else if (joinerDetails.username && joinerDetails.username !== 'Anonymous User') {
        bestUsername = joinerDetails.username;
        console.log('Using username from database lookup:', bestUsername);
      }
      else {
        console.log('Using default username:', bestUsername);
      }
      
      // Create a complete data object for broadcasting
      const joinData = {
        rideId: data.rideId,
        timestamp: new Date().toISOString(),
        rider: {
          username: bestUsername,
          userId: data.userId || (data.userInfo ? data.userInfo.userId : null)
        },
        rideDetails: {
          pickup: ride.pickup,
          drop: ride.drop,
          status: ride.status,
          driverName: driver ? driver.username : 'Unknown Driver'
        }
      };
      
      // Broadcast to ALL clients including sender (using io.emit instead of socket.broadcast.emit)
      // This ensures the creator of the ride also receives the notification
      io.emit('ride-joined', joinData);
      console.log('Broadcasting ride-joined to all clients:', joinData);
      
      // Send acknowledgment back to the client that emitted the event
      if (typeof callback === 'function') {
        console.log('Sending acknowledgment back to client');
        callback({ success: true, rideDetails: joinData.rideDetails });
      }
    } catch (error) {
      console.error('Error processing ride-joined event:', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: error.message });
      }
    }
  });
  
  // Handle ride acceptance
  socket.on('ride-accepted', async (data, callback) => {
    try {
      console.log('Ride accepted:', data);
      
      if (!data || !data.rideId) {
        return callback({ success: false, error: 'Invalid data' });
      }
      
      // Find and update the ride
      const Ride = require('./models/Ride');
      
      // Find ride and populate with full user info including phone
      const ride = await Ride.findByIdAndUpdate(
        data.rideId,
        { status: 'confirmed' },
        { new: true }
      )
      .populate('driverId', 'username phone') // Add phone
      .populate('matchedUserId', 'username phone'); // Add phone
      
      console.log('Full populated ride for acceptance:', JSON.stringify(ride, null, 2));
      
      // Debug what's available in the populated user documents
      console.log('Driver object keys:', Object.keys(ride.driverId || {}));
      console.log('Rider object keys:', Object.keys(ride.matchedUserId || {}));
      
      if (!ride) {
        return callback({ success: false, error: 'Ride not found' });
      }
      
      // Extract user details with deep inspection for phone numbers
      const driverName = ride.driverId?.username || 'Driver';
      const riderName = ride.matchedUserId?.username || 'Rider';
      
      // Try multiple approaches to extract the phone number from MongoDB documents
      // This handles both direct property access and _doc access patterns
      const driverPhone = ride.driverId?.phone || 
                        (ride.driverId?._doc?.phone) || 
                        'Not available';
                        
      const riderPhone = ride.matchedUserId?.phone || 
                       (ride.matchedUserId?._doc?.phone) || 
                       'Not available';
      
      console.log(`Ride confirmed between ${driverName} and ${riderName}`);
      console.log(`Driver phone: ${driverPhone}, Rider phone: ${riderPhone}`);
      
      // Broadcast to all clients that the ride was accepted with user details
      const responseData = {
        rideId: data.rideId,
        status: 'confirmed',
        driverName: driverName,
        riderName: riderName,
        driver: driverName,
        rider: riderName,
        driverPhone: driverPhone,  // Include phone numbers in the response
        riderPhone: riderPhone
      };
      
      console.log('Broadcasting ride acceptance with complete data:', responseData);
      io.emit('ride-accepted', responseData);
      
      // Also pass this data in the callback for the original requester
      callback({ 
        success: true,
        driverName,
        riderName,
        rideDetails: responseData  // Include full details for client to save
      });
    } catch (error) {
      console.error('Error accepting ride:', error);
      callback({ success: false, error: error.message });
    }
  });

  
  // Handle ride-declined event
  socket.on('ride-declined', (data, callback) => {
    console.log('Ride declined:', data);
    
    // Notify the ride creator that someone declined
    io.emit('ride-declined', {
      rideId: data.rideId,
      username: data.username
    });
    
    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });
  
  // Handle location updates for real-time tracking
  socket.on('location-update', (data) => {
    console.log('Location update received:', data.userRole, 'for ride:', data.rideId);
    
    // Broadcast location update to all clients for this ride
    io.emit('location-update', data);
  });
  
  // Handle ride-joined-ack (manual fallback)
  socket.on('ride-joined-ack', (data) => {
    console.log('Server received manual ride-joined-ack:', data);
    // Broadcast this as well for completeness
    socket.broadcast.emit('ride-joined-ack', data);
  });
  
  // Handle ride-created event
  socket.on('ride-created', (rideId, callback) => {
    console.log('Server received ride-created event for ride:', rideId);
    
    // If callback provided, acknowledge receipt
    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Determine MongoDB connection string
// Use MONGODB_URI environment variable from Render in production, or local MongoDB for development
const dbUri = process.env.MONGODB_URI

// Database connection
mongoose.connect(dbUri)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });