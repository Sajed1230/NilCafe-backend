const express = require('express');
const router = express.Router();
const User = require('../schemas/Users');
const { 
  sanitizeBody, 
  validateRequired, 
  validateEmailFormat,
  validatePhoneFormat,
  validateEnum,
  validateObjectIdParam
} = require('../middleware/validation');

// Admin route - creates a new user with specific role (admin, staff, delivery)
router.post('/admin/create', 
  sanitizeBody,
  validateRequired(['name', 'email', 'role']),
  validateEmailFormat,
  validatePhoneFormat,
  validateEnum('role', ['admin', 'staff', 'delivery', 'customer']),
  async (req, res) => {
  try {
    const { name, email, phone, avatar, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create new user with specified role
    const newUser = new User({
      name,
      email,
      phone: phone || '',
      avatar: avatar || '',
      role: role,
    });

    await newUser.save();

    // Return user data (excluding password if it exists)
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      avatar: newUser.avatar,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Admin create account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during account creation',
      error: error.message 
    });
  }
});

// Signup route - creates a new user with customer role
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, avatar } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create new user (role defaults to "customer" from schema)
    const newUser = new User({
      name,
      email,
      phone: phone || '',
      avatar: avatar || '',
      // password is optional, role defaults to "customer"
    });

    await newUser.save();

    // Return user data (excluding password if it exists)
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      avatar: newUser.avatar,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup',
      error: error.message 
    });
  }
});

// Login route - finds user by email and name
router.post('/login',
  sanitizeBody,
  validateRequired(['email']),
  validateEmailFormat,
  async (req, res) => {
  try {
    const { email, name } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please sign up first.' 
      });
    }

    // Optional: verify name matches (for password-free auth)
    if (name && user.name.toLowerCase() !== name.toLowerCase()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Name does not match our records' 
      });
    }

    // Return user data (excluding password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
});

// Get all accounts from database collection
router.get('/admin/accounts', async (req, res) => {
  try {
    // Fetch ALL users from the database collection (no filtering on backend)
    const accounts = await User.find({}).select('-password').sort({ createdAt: -1 });

    console.log(`Found ${accounts.length} total accounts in database`);
    accounts.forEach(acc => {
      console.log(`- ${acc.name} (${acc.email}) - Role: ${acc.role}`);
    });

    res.status(200).json({
      success: true,
      accounts: accounts
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching accounts',
      error: error.message 
    });
  }
});

// Update user role
router.put('/admin/accounts/:id/role',
  sanitizeBody,
  validateObjectIdParam('id'),
  validateRequired(['role']),
  validateEnum('role', ['admin', 'staff', 'delivery', 'customer']),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Find and update user
    const user = await User.findByIdAndUpdate(
      id,
      { role: role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log(`Updated user ${user.name} (${user.email}) role to: ${role}`);

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating role',
      error: error.message 
    });
  }
});

// Delete user account (customer can delete their own account)
router.delete('/account/:id',
  validateObjectIdParam('id'),
  async (req, res) => {
  try {
    const { id } = req.params;

    // Find user before deleting to log
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    console.log(`Deleted user: ${user.name} (${user.email}) - Role: ${user.role}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting account',
      error: error.message 
    });
  }
});

// Delete user account (admin route)
router.delete('/admin/accounts/:id',
  validateObjectIdParam('id'),
  async (req, res) => {
  try {
    const { id } = req.params;

    // Find user before deleting to log
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    console.log(`Deleted user: ${user.name} (${user.email}) - Role: ${user.role}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting account',
      error: error.message 
    });
  }
});

module.exports = router;

