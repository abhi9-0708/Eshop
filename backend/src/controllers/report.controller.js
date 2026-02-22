const { getDb } = require('../config/database');

// GET /api/reports/sales
const getSalesReport = async (req, res, next) => {
  try {
    const db = getDb();
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const conditions = ["o.status != 'cancelled'"];
    const params = [];

    if (role === 'distributor') { conditions.push('o.distributor = ?'); params.push(userId); }
    else if (role === 'sales_rep') { conditions.push('o.salesRep = ?'); params.push(userId); }

    if (startDate) { conditions.push('o.createdAt >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('o.createdAt <= ?'); params.push(endDate); }

    const where = conditions.join(' AND ');

    // Date format for grouping
    let dateFormat;
    switch (groupBy) {
      case 'month': dateFormat = '%Y-%m'; break;
      case 'week': dateFormat = '%Y-W%W'; break;
      default: dateFormat = '%Y-%m-%d';
    }

    // Sales data grouped by date
    const salesData = db.prepare(`
      SELECT strftime('${dateFormat}', o.createdAt) as date,
        COALESCE(SUM(o.totalAmount), 0) as revenue,
        COUNT(*) as orderCount,
        COALESCE(AVG(o.totalAmount), 0) as avgOrderValue
      FROM orders o
      WHERE ${where}
      GROUP BY strftime('${dateFormat}', o.createdAt)
      ORDER BY date ASC
    `).all(...params);

    // Summary stats
    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(o.totalAmount), 0) as totalRevenue,
        COUNT(*) as totalOrders,
        COALESCE(AVG(o.totalAmount), 0) as avgOrderValue,
        COALESCE(MAX(o.totalAmount), 0) as maxOrderValue,
        COALESCE(MIN(o.totalAmount), 0) as minOrderValue
      FROM orders o
      WHERE ${where}
    `).get(...params);

    // Top products
    const topProducts = db.prepare(`
      SELECT oi.productName, oi.sku,
        SUM(oi.quantity) as totalQuantity,
        SUM(oi.lineTotal) as totalRevenue,
        COUNT(DISTINCT oi.orderId) as orderCount
      FROM order_items oi
      INNER JOIN orders o ON oi.orderId = o._id
      WHERE ${where}
      GROUP BY oi.product
      ORDER BY totalRevenue DESC
      LIMIT 10
    `).all(...params);

    res.json({
      success: true,
      data: { salesData, summary, topProducts }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/performance
const getPerformanceReport = async (req, res, next) => {
  try {
    const db = getDb();
    const { startDate, endDate } = req.query;
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const conditions = ["o.status != 'cancelled'"];
    const params = [];

    if (role === 'distributor') { conditions.push('o.distributor = ?'); params.push(userId); }
    else if (role === 'sales_rep') { conditions.push('o.salesRep = ?'); params.push(userId); }
    if (startDate) { conditions.push('o.createdAt >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('o.createdAt <= ?'); params.push(endDate); }

    const where = conditions.join(' AND ');

    // Sales rep performance
    const repPerformance = db.prepare(`
      SELECT u._id, u.name, u.email, u.territory,
        COUNT(o._id) as orderCount,
        COALESCE(SUM(o.totalAmount), 0) as totalRevenue,
        COALESCE(AVG(o.totalAmount), 0) as avgOrderValue
      FROM users u
      LEFT JOIN orders o ON o.salesRep = u._id AND ${where.replace(/o\./g, 'o.')}
      WHERE u.role = 'sales_rep'
      GROUP BY u._id
      ORDER BY totalRevenue DESC
    `).all(...params);

    // Tier distribution
    const tierDistribution = db.prepare(`
      SELECT tier, COUNT(*) as count
      FROM retailers r
      ${role === 'distributor' ? 'WHERE r.distributor = ?' : role === 'sales_rep' ? 'WHERE r.assignedTo = ?' : ''}
      GROUP BY tier ORDER BY count DESC
    `).all(role !== 'admin' ? [userId] : []);

    // Category breakdown (from order items)
    const categoryBreakdown = db.prepare(`
      SELECT p.category,
        SUM(oi.lineTotal) as revenue,
        SUM(oi.quantity) as totalQuantity,
        COUNT(DISTINCT oi.orderId) as orderCount
      FROM order_items oi
      INNER JOIN orders o ON oi.orderId = o._id
      INNER JOIN products p ON oi.product = p._id
      WHERE ${where}
      GROUP BY p.category
      ORDER BY revenue DESC
    `).all(...params);

    res.json({
      success: true,
      data: { repPerformance, tierDistribution, categoryBreakdown }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSalesReport, getPerformanceReport };
