const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  // Basic ride information
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickup: { type: String, required: true },
  drop: { type: String, required: true },
  status: { type: String, enum: ['waiting', 'matched', 'active', 'completed', 'cancelled'], default: 'waiting' },
  matchedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Enhanced ride details
  fare: { type: Number },
  stops: [{ type: String }],
  departureTime: { type: Date },
  vehicleInfo: { type: String },
  availableSeats: { type: Number, default: 1, min: 1, max: 10 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  
  // Rating system
  // Driver rating (given by rider)
  driverRating: { type: Number, min: 1, max: 5 },
  driverRatingComment: { type: String },
  driverRatedAt: { type: Date },
  
  // Rider rating (given by driver)
  riderRating: { type: Number, min: 1, max: 5 },
  riderRatingComment: { type: String },
  riderRatedAt: { type: Date }
});

module.exports = mongoose.model('Ride', rideSchema);