const User = require('../models/User');
const { validationResult } = require('express-validator');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, territory, distributor } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role, phone, territory, distributor });
    const token = User.generateToken(user);

    res.status(201).json({
      success: true,
      data: { ...user, token }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email, true);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await User.update(user._id, { lastLogin: new Date().toISOString() });
    const token = User.generateToken(user);
    delete user.password;

    res.json({
      success: true,
      data: { ...user, lastLogin: new Date().toISOString(), token }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/me
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, territory } = req.body;
    const user = await User.update(req.user._id || req.user.id, { name, phone, territory });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id || req.user.id, true);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await User.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await User.hashPassword(newPassword);
    const updated = await User.update(user._id, { password: hashedPassword });
    const token = User.generateToken(updated);

    res.json({ success: true, data: { ...updated, token }, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
