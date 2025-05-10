const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateAuthInputs } = require('../middleware/validation');

router.post('/signup', validateAuthInputs, authController.signup);
router.post('/login', validateAuthInputs, authController.login);

module.exports = router;