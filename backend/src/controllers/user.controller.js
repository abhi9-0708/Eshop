const User = require('../models/User');

// GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, sort = '-createdAt' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (role) { conditions.push('role = ?'); params.push(role); }

    const where = conditions.length ? conditions.join(' AND ') : '1=1';
    let orderBy = 'createdAt DESC';
    if (sort) {
      const desc = sort.startsWith('-');
      const field = sort.replace(/^-/, '');
      orderBy = `${field} ${desc ? 'DESC' : 'ASC'}`;
    }

    const users = User.findAll({ where, params, orderBy, limit: limitNum, offset });
    const total = User.count(where, params);

    res.json({
      success: true,
      data: users,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const existing = User.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = User.update(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const existing = User.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (existing.role === 'admin') {
      const adminCount = User.count("role = 'admin'");
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last admin user' });
      }
    }
    User.delete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/distributors
const getDistributors = async (req, res, next) => {
  try {
    const distributors = User.findAll({ where: "role = 'distributor' AND isActive = 1", limit: 100 });
    res.json({ success: true, data: distributors });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/sales-reps
const getSalesReps = async (req, res, next) => {
  try {
    const conditions = ["role = 'sales_rep' AND isActive = 1"];
    const params = [];

    if (req.user.role === 'distributor') {
      conditions.push('distributor = ?');
      params.push(req.user._id || req.user.id);
    }

    const salesReps = User.findAll({ where: conditions.join(' AND '), params, limit: 100 });
    res.json({ success: true, data: salesReps });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUser, updateUser, deleteUser, getDistributors, getSalesReps };
