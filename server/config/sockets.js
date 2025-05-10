const Ride = require('../models/Ride');

// Simple version that definitely works
function setupSockets(server) {
  const io = require('socket.io')(server);

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When driver creates a ride
    socket.on('create-ride', async (data) => {
      try {
        const newRide = await Ride.create({
          driverId: data.driverId,
          pickup: data.pickup,
          drop: data.drop,
          status: 'waiting'
        });
        console.log('New ride created:', newRide._id);
        io.emit('new-ride', newRide); // Send to all users
      } catch (error) {
        console.error('Error creating ride:', error);
      }
    });

    // When rider joins a ride
    socket.on('ride-joined', async (data, callback) => {
      try {
        console.log('Ride join request received:', data);
        const { rideId, username } = data;
        
        // Find the ride without updating it yet
        const ride = await Ride.findById(rideId).populate('driverId');
        
        if (!ride) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Ride not found' });
          }
          return;
        }
        
        console.log('Ride joined:', ride._id);
        
        // Send acknowledgment back to sender
        if (typeof callback === 'function') {
          callback({ success: true, ride });
        }
        
        // Notify the driver about the rider joining
        io.to(ride.driverId.toString()).emit('ride-joined', {
          rideId: ride._id,
          username: username || 'A rider'
        });
        
        console.log('Notification sent to driver:', ride.driverId);
      }
      } catch (error) {
        console.error('Error joining ride:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}

// This export will definitely work
module.exports = setupSockets;