const Order = require('../models/Order');
const Product = require('../models/Product');
const Retailer = require('../models/Retailer');
const { getDb } = require('../config/database');

// GET /api/orders
const getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    // Role-based filtering
    if (req.user.role === 'distributor') {
      conditions.push('o.distributor = ?');
      params.push(req.user._id || req.user.id);
    } else if (req.user.role === 'sales_rep') {
      conditions.push('o.salesRep = ?');
      params.push(req.user._id || req.user.id);
    }

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    const where = conditions.length ? conditions.join(' AND ') : '1=1';
    let orderBy = 'o.createdAt DESC';
    if (sort) {
      const desc = sort.startsWith('-');
      const field = sort.replace(/^-/, '');
      orderBy = `o.${field} ${desc ? 'DESC' : 'ASC'}`;
    }

    const orders = Order.findAll({ where, params, orderBy, limit: limitNum, offset, populate: true });
    const total = Order.count(where, params);

    res.json({
      success: true,
      data: orders,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:id
const getOrder = async (req, res, next) => {
  try {
    const order = Order.findById(req.params.id, true);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders
const createOrder = async (req, res, next) => {
  try {
    const { retailer: retailerId, items, notes, deliveryDate, deliveryAddress, paymentMethod, taxRate = 0, discountAmount = 0 } = req.body;

    // Validate retailer
    const retailer = Retailer.findById(retailerId);
    if (!retailer) {
      return res.status(404).json({ success: false, message: 'Retailer not found' });
    }

    // Build order items and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }
      if (!product.isActive) {
        return res.status(400).json({ success: false, message: `Product is not available: ${product.name}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }

      const unitPrice = product.price;
      const discount = item.discount || 0;
      const lineTotal = (unitPrice * item.quantity) - discount;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        discount,
        lineTotal
      });
    }

    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Determine distributor
    const distributorId = typeof retailer.distributor === 'object' ? retailer.distributor._id : retailer.distributor;
    const salesRepId = req.user._id || req.user.id;

    const order = Order.create({
      retailer: retailerId,
      distributor: distributorId,
      salesRep: salesRepId,
      items: orderItems,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      notes,
      deliveryDate,
      deliveryAddress,
      statusHistory: [{ status: 'pending', changedBy: salesRepId, notes: 'Order created' }]
    });

    // Reduce stock for each item
    const db = getDb();
    for (const item of orderItems) {
      db.prepare('UPDATE products SET stock = stock - ?, updatedAt = ? WHERE _id = ?')
        .run(item.quantity, new Date().toISOString(), item.product);
    }

    // Update retailer stats
    db.prepare('UPDATE retailers SET totalOrders = totalOrders + 1, lastOrderDate = ?, outstandingBalance = outstandingBalance + ?, updatedAt = ? WHERE _id = ?')
      .run(new Date().toISOString(), totalAmount, new Date().toISOString(), retailerId);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const order = Order.findById(req.params.id, true);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${status}`
      });
    }

    // If cancelling, restore stock
    if (status === 'cancelled' && order.items) {
      const db = getDb();
      for (const item of order.items) {
        db.prepare('UPDATE products SET stock = stock + ?, updatedAt = ? WHERE _id = ?')
          .run(item.quantity, new Date().toISOString(), item.product);
      }
    }

    Order.addStatusHistory(order._id, {
      status,
      changedBy: req.user._id || req.user.id,
      notes: notes || `Status changed to ${status}`
    });

    const updated = Order.update(order._id, { status });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/payment
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const order = Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const updateData = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const updated = Order.update(order._id, updateData);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrderStatus, updatePaymentStatus };
