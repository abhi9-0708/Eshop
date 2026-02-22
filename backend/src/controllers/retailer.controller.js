const Retailer = require('../models/Retailer');

// GET /api/retailers
const getRetailers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, category, tier, sort = '-createdAt' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    // Role-based filtering
    if (req.user.role === 'distributor') {
      conditions.push('r.distributor = ?');
      params.push(req.user._id || req.user.id);
    } else if (req.user.role === 'sales_rep') {
      conditions.push('r.assignedTo = ?');
      params.push(req.user._id || req.user.id);
    }

    if (search) {
      conditions.push('(r.name LIKE ? OR r.ownerName LIKE ? OR r.phone LIKE ? OR r.addressCity LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status) { conditions.push('r.status = ?'); params.push(status); }
    if (category) { conditions.push('r.category = ?'); params.push(category); }
    if (tier) { conditions.push('r.tier = ?'); params.push(tier); }

    const where = conditions.length ? conditions.join(' AND ') : '1=1';
    let orderBy = 'r.createdAt DESC';
    if (sort) {
      const desc = sort.startsWith('-');
      const field = sort.replace(/^-/, '');
      orderBy = `r.${field} ${desc ? 'DESC' : 'ASC'}`;
    }

    const retailers = Retailer.findAll({ where, params, orderBy, limit: limitNum, offset, populate: true });
    const total = Retailer.count(where, params);

    res.json({
      success: true,
      data: retailers,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/retailers/:id
const getRetailer = async (req, res, next) => {
  try {
    const retailer = Retailer.findById(req.params.id, true);
    if (!retailer) {
      return res.status(404).json({ success: false, message: 'Retailer not found' });
    }
    res.json({ success: true, data: retailer });
  } catch (error) {
    next(error);
  }
};

// POST /api/retailers
const createRetailer = async (req, res, next) => {
  try {
    // Use request user as assignedTo if not provided
    const data = { ...req.body };
    if (!data.assignedTo) data.assignedTo = req.user._id || req.user.id;
    if (!data.distributor && req.user.role === 'distributor') data.distributor = req.user._id || req.user.id;
    if (!data.distributor && req.user.role === 'sales_rep') data.distributor = req.user.distributor;

    const retailer = Retailer.create(data);
    res.status(201).json({ success: true, data: retailer });
  } catch (error) {
    next(error);
  }
};

// PUT /api/retailers/:id
const updateRetailer = async (req, res, next) => {
  try {
    const existing = Retailer.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Retailer not found' });
    }
    const retailer = Retailer.update(req.params.id, req.body);
    res.json({ success: true, data: retailer });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/retailers/:id
const deleteRetailer = async (req, res, next) => {
  try {
    const existing = Retailer.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Retailer not found' });
    }
    Retailer.delete(req.params.id);
    res.json({ success: true, message: 'Retailer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRetailers, getRetailer, createRetailer, updateRetailer, deleteRetailer };
