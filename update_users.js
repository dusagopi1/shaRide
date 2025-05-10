// Script to update existing users with phone numbers
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    updateUsers();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function updateUsers() {
  try {
    // Get User model
    const User = require('./server/models/User');
    
    // Find users without phone numbers
    const users = await User.find({ phone: { $exists: false } });
    console.log(`Found ${users.length} users without phone numbers`);
    
    // Update each user
    let updatedCount = 0;
    for (const user of users) {
      user.phone = `${user.username}-phone`;  // Example default phone number
      await user.save();
      updatedCount++;
      console.log(`Updated user: ${user.username} with phone: ${user.phone}`);
    }
    
    console.log(`Successfully updated ${updatedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
}
