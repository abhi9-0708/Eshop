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
  findById(id) {
    const row = getDb().prepare('SELECT * FROM visits WHERE _id = ?').get(id);
    return formatVisit(row);
  },

  findAll({ where = '1=1', params = [], orderBy = 'visitDate DESC', limit = 20, offset = 0 } = {}) {
    const rows = getDb().prepare(`SELECT * FROM visits WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return rows.map(formatVisit);
  },

  create(data) {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO visits (_id, retailer, salesRep, visitDate, checkInTime, checkOutTime, purpose, outcome, notes, orderCreated, locationLat, locationLng, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.retailer, data.salesRep, data.visitDate || now,
      data.checkInTime || null, data.checkOutTime || null,
      data.purpose, data.outcome || 'no_order', data.notes || null,
      data.orderCreated || null,
      data.location?.coordinates?.[1] || 0, data.location?.coordinates?.[0] || 0,
      now, now
    );
    return Visit.findById(id);
  },

  count(where = '1=1', params = []) {
    const row = getDb().prepare(`SELECT COUNT(*) as count FROM visits WHERE ${where}`).get(...params);
    return row.count;
  }
};

module.exports = Visit;
