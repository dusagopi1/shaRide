const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create a new user with phone number
    const user = new User({ username, password, phone });
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
        { userId: user._id, username },
        process.env.JWT_SECRET,
        {expiresIn: '365d' }
      );
      
      console.log('Generated token:', token); // Debug log
      res.json({ token, userId: user._id, username, phone }); 
    // res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Server error during signup' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Return user data including phone number
    res.json({ 
      token, 
      userId: user._id, 
      username: user.username, 
      phone: user.phone 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};