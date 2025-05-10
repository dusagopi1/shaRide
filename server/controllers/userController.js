const User = require('../models/User');

/**
 * Update user profile
 * Allows users to update their username and phone number
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, phone } = req.body;
    const userId = req.userId; // From auth middleware
    
    // Validate required fields
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Check if username is already taken (if changing username)
    const existingUser = await User.findOne({ 
      username, 
      _id: { $ne: userId } // Exclude current user from check
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        username,
        phone: phone || 'Not provided' // Default value if phone is empty
      },
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from response
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return updated user info
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        userId: updatedUser._id,
        username: updatedUser.username,
        phone: updatedUser.phone
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
};

/**
 * Get user profile
 * Returns the current user's profile information
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      userId: user._id,
      username: user.username,
      phone: user.phone
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
};
