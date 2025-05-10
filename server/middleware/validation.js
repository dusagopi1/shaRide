const { body, validationResult } = require('express-validator');

// Auth validation rules
const validateAuthInputs = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => err.msg)
      });
    }
    next();
  }
];

// Ride validation rules
const validateRideInputs = [
  body('pickup')
    .trim()
    .notEmpty().withMessage('Pickup location is required'),
  
  body('drop')
    .trim()
    .notEmpty().withMessage('Drop location is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => err.msg)
      });
    }
    next();
  }
];

module.exports = {
  validateAuthInputs,
  validateRideInputs
};