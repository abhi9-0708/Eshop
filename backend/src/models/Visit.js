const { getDb } = require('../config/database');
const crypto = require('crypto');

function formatVisit(row) {
  if (!row) return null;
  return {
    _id: row._id,
    retailer: row.retailer,
    salesRep: row.salesRep,
    visitDate: row.visitDate,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    purpose: row.purpose,
    outcome: row.outcome,
    notes: row.notes,
    orderCreated: row.orderCreated,
    location: { type: 'Point', coordinates: [row.locationLng || 0, row.locationLat || 0] },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

const Visit = {
  async findById(id) {
    const pool = getDb();
    const { rows } = await pool.query('SELECT * FROM visits WHERE _id = $1', [id]);
    return formatVisit(rows[0]);
  },

  async findAll({ where = '1=1', params = [], orderBy = '"visitDate" DESC', limit = 20, offset = 0 } = {}) {
    const pool = getDb();
    const paramCount = params.length;
    const sql = `SELECT * FROM visits WHERE ${where} ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    const { rows } = await pool.query(sql, [...params, limit, offset]);
    return rows.map(formatVisit);
  },

  async create(data) {
    const pool = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO visits (_id, retailer, "salesRep", "visitDate", "checkInTime", "checkOutTime", purpose, outcome, notes, "orderCreated", "locationLat", "locationLng", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, data.retailer, data.salesRep, data.visitDate || now,
       data.checkInTime || null, data.checkOutTime || null,
       data.purpose, data.outcome || 'no_order', data.notes || null,
       data.orderCreated || null,
       data.location?.coordinates?.[1] || 0, data.location?.coordinates?.[0] || 0,
       now, now]
    );
    return Visit.findById(id);
  },

  async count(where = '1=1', params = []) {
    const pool = getDb();
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM visits WHERE ${where}`, params);
    return parseInt(rows[0].count);
  }
};

module.exports = Visit;
