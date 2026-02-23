const { getDb } = require('../config/database');

// GET /api/reports/sales
const getSalesReport = async (req, res, next) => {
  try {
    const pool = getDb();
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const conditions = ["o.status != 'cancelled'"];
    const params = [];
    let paramIdx = 1;

    if (role === 'distributor') { conditions.push(`o.distributor = $${paramIdx++}`); params.push(userId); }
    else if (role === 'sales_rep') { conditions.push(`o."salesRep" = $${paramIdx++}`); params.push(userId); }

    if (startDate) { conditions.push(`o."createdAt" >= $${paramIdx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`o."createdAt" <= $${paramIdx++}`); params.push(endDate); }

    const where = conditions.join(' AND ');

    // Date format for grouping
    let dateFormat;
    switch (groupBy) {
      case 'month': dateFormat = 'YYYY-MM'; break;
      case 'week': dateFormat = 'IYYY-"W"IW'; break;
      default: dateFormat = 'YYYY-MM-DD';
    }

    // Sales data grouped by date
    const { rows: salesData } = await pool.query(`
      SELECT to_char(o."createdAt"::timestamp, '${dateFormat}') as date,
        COALESCE(SUM(o."totalAmount"), 0) as revenue,
        COUNT(*) as "orderCount",
        COALESCE(AVG(o."totalAmount"), 0) as "avgOrderValue"
      FROM orders o
      WHERE ${where}
      GROUP BY to_char(o."createdAt"::timestamp, '${dateFormat}')
      ORDER BY date ASC
    `, params);

    // Summary stats
    const { rows: summaryRows } = await pool.query(`
      SELECT
        COALESCE(SUM(o."totalAmount"), 0) as "totalRevenue",
        COUNT(*) as "totalOrders",
        COALESCE(AVG(o."totalAmount"), 0) as "avgOrderValue",
        COALESCE(MAX(o."totalAmount"), 0) as "maxOrderValue",
        COALESCE(MIN(o."totalAmount"), 0) as "minOrderValue"
      FROM orders o
      WHERE ${where}
    `, params);

    // Top products
    const { rows: topProducts } = await pool.query(`
      SELECT oi."productName", oi.sku,
        SUM(oi.quantity) as "totalQuantity",
        SUM(oi."lineTotal") as "totalRevenue",
        COUNT(DISTINCT oi."orderId") as "orderCount"
      FROM order_items oi
      INNER JOIN orders o ON oi."orderId" = o._id
      WHERE ${where}
      GROUP BY oi.product, oi."productName", oi.sku
      ORDER BY "totalRevenue" DESC
      LIMIT 10
    `, params);

    res.json({
      success: true,
      data: { salesData, summary: summaryRows[0], topProducts }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/performance
const getPerformanceReport = async (req, res, next) => {
  try {
    const pool = getDb();
    const { startDate, endDate } = req.query;
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const conditions = ["o.status != 'cancelled'"];
    const params = [];
    let paramIdx = 1;

    if (role === 'distributor') { conditions.push(`o.distributor = $${paramIdx++}`); params.push(userId); }
    else if (role === 'sales_rep') { conditions.push(`o."salesRep" = $${paramIdx++}`); params.push(userId); }
    if (startDate) { conditions.push(`o."createdAt" >= $${paramIdx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`o."createdAt" <= $${paramIdx++}`); params.push(endDate); }

    const where = conditions.join(' AND ');

    // Sales rep performance
    const { rows: repPerformance } = await pool.query(`
      SELECT u._id, u.name, u.email, u.territory,
        COUNT(o._id) as "orderCount",
        COALESCE(SUM(o."totalAmount"), 0) as "totalRevenue",
        COALESCE(AVG(o."totalAmount"), 0) as "avgOrderValue"
      FROM users u
      LEFT JOIN orders o ON o."salesRep" = u._id AND ${where}
      WHERE u.role = 'sales_rep'
      GROUP BY u._id, u.name, u.email, u.territory
      ORDER BY "totalRevenue" DESC
    `, params);

    // Tier distribution
    let tierSQL = 'SELECT tier, COUNT(*) as count FROM retailers r';
    const tierParams = [];
    if (role === 'distributor') {
      tierSQL += ' WHERE r.distributor = $1';
      tierParams.push(userId);
    } else if (role === 'sales_rep') {
      tierSQL += ' WHERE r."assignedTo" = $1';
      tierParams.push(userId);
    }
    tierSQL += ' GROUP BY tier ORDER BY count DESC';
    const { rows: tierDistribution } = await pool.query(tierSQL, tierParams);

    // Category breakdown (from order items)
    const { rows: categoryBreakdown } = await pool.query(`
      SELECT p.category,
        SUM(oi."lineTotal") as revenue,
        SUM(oi.quantity) as "totalQuantity",
        COUNT(DISTINCT oi."orderId") as "orderCount"
      FROM order_items oi
      INNER JOIN orders o ON oi."orderId" = o._id
      INNER JOIN products p ON oi.product = p._id
      WHERE ${where}
      GROUP BY p.category
      ORDER BY revenue DESC
    `, params);

    res.json({
      success: true,
      data: { repPerformance, tierDistribution, categoryBreakdown }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSalesReport, getPerformanceReport };
