const db = require("../db");

exports.getActivitiesByStudent = async (req, res) => {
  const startTime = Date.now();
  try {
    const { startDate, endDate } = req.query;

    console.log('[getActivitiesByStudent] Request started', {
      timestamp: new Date().toISOString(),
      startDate,
      endDate,
      hasDateFilter: !!(startDate && endDate),
      ip: req.ip
    });

    let sql = `
      SELECT 
        DATE(sal.created_at) AS date,
        sal.module,
        COUNT(*) AS visits,
        s.section
      FROM studentActivityLog sal
      JOIN students s ON sal.student_id = s.id
    `;

    const params = [];

    // Add date filter if provided
    if (startDate && endDate) {
      sql += ` WHERE DATE(sal.created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
      
      console.log('[getActivitiesByStudent] Date filter applied', {
        timestamp: new Date().toISOString(),
        startDate,
        endDate,
        dateRange: `${startDate} to ${endDate}`
      });
    }

    sql += `
      GROUP BY DATE(sal.created_at), sal.module, s.section
      ORDER BY DATE(sal.created_at) DESC;
    `;
    
    const [rows] = await db.query(sql, params);
    
    // Calculate statistics
    const moduleStats = rows.reduce((acc, row) => {
      acc[row.module] = (acc[row.module] || 0) + parseInt(row.visits);
      return acc;
    }, {});

    const sectionStats = rows.reduce((acc, row) => {
      acc[row.section] = (acc[row.section] || 0) + parseInt(row.visits);
      return acc;
    }, {});

    const totalVisits = rows.reduce((sum, row) => sum + parseInt(row.visits), 0);
    const uniqueDates = [...new Set(rows.map(row => row.date))].length;

    console.log('[getActivitiesByStudent] Request successful', {
      timestamp: new Date().toISOString(),
      resultCount: rows.length,
      totalVisits,
      uniqueDates,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all time',
      moduleBreakdown: moduleStats,
      sectionBreakdown: sectionStats,
      topModule: Object.entries(moduleStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      duration: `${Date.now() - startTime}ms`
    });
    
    res.json({ activities: rows });
  } catch (err) {
    console.error('[getActivitiesByStudent] Request failed', {
      timestamp: new Date().toISOString(),
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      error: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    res.status(500).json({ error: "Server error" });
  }
};

exports.insertActivity = async (req, res) => {
  const startTime = Date.now();
  try {
    const student_id = req.params.id;
    const { module } = req.body;

    console.log('[insertActivity] Request started', {
      timestamp: new Date().toISOString(),
      student_id,
      module,
      ip: req.ip
    });

    if (!student_id || !module) {
      console.warn('[insertActivity] Validation failed - missing fields', {
        timestamp: new Date().toISOString(),
        hasStudentId: !!student_id,
        hasModule: !!module
      });
      
      return res.status(400).json({ message: "Student ID and Module are required" });
    }

    const allowedModules = ['Resource', 'Wellness', 'Chatbot', 'Mood', 'Scheduler', 'Pet'];
    
    if (!allowedModules.includes(module)) {
      console.warn('[insertActivity] Validation failed - invalid module', {
        timestamp: new Date().toISOString(),
        student_id,
        providedModule: module,
        allowedModules
      });
      
      return res.status(400).json({ message: "Invalid module" });
    }

    await db.query(
      `INSERT INTO studentActivityLog (student_id, module) VALUES (?, ?)`,
      [student_id, module]
    );

    console.log('[insertActivity] Request successful', {
      timestamp: new Date().toISOString(),
      student_id,
      module,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(201).json({ message: "Activity logged successfully" });
  } catch (err) {
    console.error('[insertActivity] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.params.id,
      module: req.body.module,
      error: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};