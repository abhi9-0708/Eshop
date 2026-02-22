const { getDb } = require('../config/database');
const crypto = require('crypto');

function formatOrder(row, items, statusHistory) {
  if (!row) return null;
  const o = {
    _id: row._id,
    orderNumber: row.orderNumber,
    subtotal: row.subtotal,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    discountAmount: row.discountAmount,
    totalAmount: row.totalAmount,
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    deliveryDate: row.deliveryDate,
    deliveryAddress: {
      street: row.deliveryStreet,
      city: row.deliveryCity,
      state: row.deliveryState,
      zipCode: row.deliveryZipCode
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };

  // Populated retailer
  if (row.ret_id) {
    o.retailer = { _id: row.ret_id, name: row.ret_name, ownerName: row.ret_ownerName, phone: row.ret_phone, address: { street: row.ret_addressStreet, city: row.ret_addressCity, state: row.ret_addressState, zipCode: row.ret_addressZipCode } };
  } else {
    o.retailer = row.retailer;
  }

  // Populated salesRep
  if (row.sr_id) {
    o.salesRep = { _id: row.sr_id, name: row.sr_name, email: row.sr_email, phone: row.sr_phone };
  } else {
    o.salesRep = row.salesRep;
  }

  // Populated distributor
  if (row.dist_id) {
    o.distributor = { _id: row.dist_id, name: row.dist_name, email: row.dist_email, phone: row.dist_phone };
  } else {
    o.distributor = row.distributor;
  }

  if (items) o.items = items;
  if (statusHistory) o.statusHistory = statusHistory;
  return o;
}

const POPULATE_JOIN = `
  LEFT JOIN retailers ret ON o.retailer = ret._id
  LEFT JOIN users sr ON o.salesRep = sr._id
  LEFT JOIN users dist ON o.distributor = dist._id
`;
const POPULATE_COLS = `,
  ret._id as ret_id, ret.name as ret_name, ret.ownerName as ret_ownerName, ret.phone as ret_phone,
  ret.addressStreet as ret_addressStreet, ret.addressCity as ret_addressCity, ret.addressState as ret_addressState, ret.addressZipCode as ret_addressZipCode,
  sr._id as sr_id, sr.name as sr_name, sr.email as sr_email, sr.phone as sr_phone,
  dist._id as dist_id, dist.name as dist_name, dist.email as dist_email, dist.phone as dist_phone
`;

function getItems(orderId) {
  return getDb().prepare('SELECT * FROM order_items WHERE orderId = ?').all(orderId);
}

function getStatusHistory(orderId) {
  return getDb().prepare('SELECT * FROM order_status_history WHERE orderId = ? ORDER BY changedAt ASC').all(orderId);
}

const Order = {
  findById(id, populate = false) {
    const db = getDb();
    let row;
    if (populate) {
      row = db.prepare(`SELECT o.* ${POPULATE_COLS} FROM orders o ${POPULATE_JOIN} WHERE o._id = ?`).get(id);
    } else {
      row = db.prepare('SELECT * FROM orders WHERE _id = ?').get(id);
    }
    if (!row) return null;
    return formatOrder(row, getItems(id), getStatusHistory(id));
  },

  findAll({ where = '1=1', params = [], orderBy = 'o.createdAt DESC', limit = 20, offset = 0, populate = false } = {}) {
    const db = getDb();
    let sql;
    if (populate) {
      sql = `SELECT o.* ${POPULATE_COLS} FROM orders o ${POPULATE_JOIN} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    } else {
      sql = `SELECT o.* FROM orders o WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    }
    const rows = db.prepare(sql).all(...params, limit, offset);
    return rows.map(r => formatOrder(r, getItems(r._id), getStatusHistory(r._id)));
  },

  create(data) {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const orderNumber = Order.generateOrderNumber();

    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO orders (_id, orderNumber, retailer, distributor, salesRep, subtotal, taxRate, taxAmount, discountAmount, totalAmount, status, paymentStatus, paymentMethod, notes, deliveryDate, deliveryStreet, deliveryCity, deliveryState, deliveryZipCode, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, orderNumber, data.retailer, data.distributor, data.salesRep,
        data.subtotal, data.taxRate || 0, data.taxAmount || 0, data.discountAmount || 0, data.totalAmount,
        data.status || 'pending', data.paymentStatus || 'unpaid', data.paymentMethod || 'cash',
        data.notes || null, data.deliveryDate || null,
        data.deliveryAddress?.street || null, data.deliveryAddress?.city || null,
        data.deliveryAddress?.state || null, data.deliveryAddress?.zipCode || null,
        now, now
      );

      // Insert items
      const insertItem = db.prepare(`INSERT INTO order_items (orderId, product, productName, sku, quantity, unitPrice, discount, lineTotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const item of (data.items || [])) {
        insertItem.run(id, item.product, item.productName, item.sku, item.quantity, item.unitPrice, item.discount || 0, item.lineTotal);
      }

      // Insert initial status history
      const insertHistory = db.prepare(`INSERT INTO order_status_history (orderId, status, changedBy, changedAt, notes) VALUES (?, ?, ?, ?, ?)`);
      for (const sh of (data.statusHistory || [])) {
        insertHistory.run(id, sh.status, sh.changedBy, sh.changedAt || now, sh.notes || null);
      }
    });
    tx();
    return Order.findById(id, true);
  },

  update(id, data) {
    const db = getDb();
    const sets = [];
    const values = [];
    const allowed = ['status', 'paymentStatus', 'paymentMethod', 'notes', 'deliveryDate'];
    for (const key of allowed) {
      if (data[key] !== undefined) { sets.push(`${key} = ?`); values.push(data[key]); }
    }
    if (data.deliveryAddress) {
      if (data.deliveryAddress.street !== undefined) { sets.push('deliveryStreet = ?'); values.push(data.deliveryAddress.street); }
      if (data.deliveryAddress.city !== undefined) { sets.push('deliveryCity = ?'); values.push(data.deliveryAddress.city); }
      if (data.deliveryAddress.state !== undefined) { sets.push('deliveryState = ?'); values.push(data.deliveryAddress.state); }
      if (data.deliveryAddress.zipCode !== undefined) { sets.push('deliveryZipCode = ?'); values.push(data.deliveryAddress.zipCode); }
    }
    if (sets.length === 0) return Order.findById(id, true);
    sets.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE _id = ?`).run(...values);
    return Order.findById(id, true);
  },

  addStatusHistory(orderId, entry) {
    const db = getDb();
    db.prepare(`INSERT INTO order_status_history (orderId, status, changedBy, changedAt, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(orderId, entry.status, entry.changedBy, entry.changedAt || new Date().toISOString(), entry.notes || null);
  },

  count(where = '1=1', params = []) {
    const row = getDb().prepare(`SELECT COUNT(*) as count FROM orders o WHERE ${where}`).get(...params);
    return row.count;
  },

  generateOrderNumber() {
    const db = getDb();
    const date = new Date();
    const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const row = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE orderNumber LIKE ?`).get(`${prefix}%`);
    return `${prefix}-${String((row.count || 0) + 1).padStart(5, '0')}`;
  }
};

module.exports = Order;
