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

  if (row.ret_id) {
    o.retailer = { _id: row.ret_id, name: row.ret_name, ownerName: row.ret_ownerName, phone: row.ret_phone, address: { street: row.ret_addressStreet, city: row.ret_addressCity, state: row.ret_addressState, zipCode: row.ret_addressZipCode } };
  } else {
    o.retailer = row.retailer;
  }

  if (row.sr_id) {
    o.salesRep = { _id: row.sr_id, name: row.sr_name, email: row.sr_email, phone: row.sr_phone };
  } else {
    o.salesRep = row.salesRep;
  }

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
  LEFT JOIN users sr ON o."salesRep" = sr._id
  LEFT JOIN users dist ON o.distributor = dist._id
`;
const POPULATE_COLS = `,
  ret._id as ret_id, ret.name as ret_name, ret."ownerName" as "ret_ownerName", ret.phone as ret_phone,
  ret."addressStreet" as "ret_addressStreet", ret."addressCity" as "ret_addressCity", ret."addressState" as "ret_addressState", ret."addressZipCode" as "ret_addressZipCode",
  sr._id as sr_id, sr.name as sr_name, sr.email as sr_email, sr.phone as sr_phone,
  dist._id as dist_id, dist.name as dist_name, dist.email as dist_email, dist.phone as dist_phone
`;

async function getItems(pool, orderId) {
  const { rows } = await pool.query('SELECT * FROM order_items WHERE "orderId" = $1', [orderId]);
  return rows;
}

async function getStatusHistory(pool, orderId) {
  const { rows } = await pool.query('SELECT * FROM order_status_history WHERE "orderId" = $1 ORDER BY "changedAt" ASC', [orderId]);
  return rows;
}

const Order = {
  async findById(id, populate = false) {
    const pool = getDb();
    let sql;
    if (populate) {
      sql = `SELECT o.* ${POPULATE_COLS} FROM orders o ${POPULATE_JOIN} WHERE o._id = $1`;
    } else {
      sql = 'SELECT * FROM orders WHERE _id = $1';
    }
    const { rows } = await pool.query(sql, [id]);
    if (!rows[0]) return null;
    const items = await getItems(pool, id);
    const history = await getStatusHistory(pool, id);
    return formatOrder(rows[0], items, history);
  },

  async findAll({ where = '1=1', params = [], orderBy = 'o."createdAt" DESC', limit = 20, offset = 0, populate = false } = {}) {
    const pool = getDb();
    const paramCount = params.length;
    let sql;
    if (populate) {
      sql = `SELECT o.* ${POPULATE_COLS} FROM orders o ${POPULATE_JOIN} WHERE ${where} ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    } else {
      sql = `SELECT o.* FROM orders o WHERE ${where} ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    }
    const { rows } = await pool.query(sql, [...params, limit, offset]);
    const results = [];
    for (const r of rows) {
      const items = await getItems(pool, r._id);
      const history = await getStatusHistory(pool, r._id);
      results.push(formatOrder(r, items, history));
    }
    return results;
  },

  async create(data) {
    const pool = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const orderNumber = await Order.generateOrderNumber();

    await pool.query(
      `INSERT INTO orders (_id, "orderNumber", retailer, distributor, "salesRep", subtotal, "taxRate", "taxAmount", "discountAmount", "totalAmount", status, "paymentStatus", "paymentMethod", notes, "deliveryDate", "deliveryStreet", "deliveryCity", "deliveryState", "deliveryZipCode", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [id, orderNumber, data.retailer, data.distributor, data.salesRep,
       data.subtotal, data.taxRate || 0, data.taxAmount || 0, data.discountAmount || 0, data.totalAmount,
       data.status || 'pending', data.paymentStatus || 'unpaid', data.paymentMethod || 'cash',
       data.notes || null, data.deliveryDate || null,
       data.deliveryAddress?.street || null, data.deliveryAddress?.city || null,
       data.deliveryAddress?.state || null, data.deliveryAddress?.zipCode || null,
       now, now]
    );

    for (const item of (data.items || [])) {
      await pool.query(
        `INSERT INTO order_items ("orderId", product, "productName", sku, quantity, "unitPrice", discount, "lineTotal") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, item.product, item.productName, item.sku, item.quantity, item.unitPrice, item.discount || 0, item.lineTotal]
      );
    }

    for (const sh of (data.statusHistory || [])) {
      await pool.query(
        `INSERT INTO order_status_history ("orderId", status, "changedBy", "changedAt", notes) VALUES ($1, $2, $3, $4, $5)`,
        [id, sh.status, sh.changedBy, sh.changedAt || now, sh.notes || null]
      );
    }

    return Order.findById(id, true);
  },

  async update(id, data) {
    const pool = getDb();
    const sets = [];
    const values = [];
    let paramIdx = 1;
    const allowed = ['status', 'paymentStatus', 'paymentMethod', 'notes', 'deliveryDate'];
    const quotedCols = ['paymentStatus', 'paymentMethod', 'deliveryDate'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        const col = quotedCols.includes(key) ? `"${key}"` : key;
        sets.push(`${col} = $${paramIdx++}`);
        values.push(data[key]);
      }
    }
    if (data.deliveryAddress) {
      if (data.deliveryAddress.street !== undefined) { sets.push(`"deliveryStreet" = $${paramIdx++}`); values.push(data.deliveryAddress.street); }
      if (data.deliveryAddress.city !== undefined) { sets.push(`"deliveryCity" = $${paramIdx++}`); values.push(data.deliveryAddress.city); }
      if (data.deliveryAddress.state !== undefined) { sets.push(`"deliveryState" = $${paramIdx++}`); values.push(data.deliveryAddress.state); }
      if (data.deliveryAddress.zipCode !== undefined) { sets.push(`"deliveryZipCode" = $${paramIdx++}`); values.push(data.deliveryAddress.zipCode); }
    }
    if (sets.length === 0) return Order.findById(id, true);
    sets.push(`"updatedAt" = $${paramIdx++}`);
    values.push(new Date().toISOString());
    values.push(id);
    await pool.query(`UPDATE orders SET ${sets.join(', ')} WHERE _id = $${paramIdx}`, values);
    return Order.findById(id, true);
  },

  async addStatusHistory(orderId, entry) {
    const pool = getDb();
    await pool.query(
      `INSERT INTO order_status_history ("orderId", status, "changedBy", "changedAt", notes) VALUES ($1, $2, $3, $4, $5)`,
      [orderId, entry.status, entry.changedBy, entry.changedAt || new Date().toISOString(), entry.notes || null]
    );
  },

  async count(where = '1=1', params = []) {
    const pool = getDb();
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM orders o WHERE ${where}`, params);
    return parseInt(rows[0].count);
  },

  async generateOrderNumber() {
    const pool = getDb();
    const date = new Date();
    const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM orders WHERE "orderNumber" LIKE $1`, [`${prefix}%`]);
    return `${prefix}-${String((parseInt(rows[0].count) || 0) + 1).padStart(5, '0')}`;
  }
};

module.exports = Order;
