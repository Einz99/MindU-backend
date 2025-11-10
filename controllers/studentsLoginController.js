const db = require("../db");

exports.getAllStudentLogInCounts = async (req, res) => {
  const startTime = Date.now();
  try {
    const { startDate, endDate } = req.query;

    console.log('[getAllStudentLogInCounts] Request started', {
      timestamp: new Date().toISOString(),
      startDate,
      endDate,
      hasDateFilter: !!(startDate && endDate),
      ip: req.ip
    });

    // 1️⃣ Fetch total students count
    const [totalRows] = await db.query(`SELECT COUNT(*) AS total FROM students`);
    const totalStudents = totalRows[0]?.total || 0;

    console.log('[getAllStudentLogInCounts] Total students fetched', {
      timestamp: new Date().toISOString(),
      totalStudents
    });

    // 2️⃣ Fetch all login records with student sections within date range
    let sql = `
      SELECT 
        sl.student_id,
        DATE(sl.login_time) AS login_date,
        s.section
      FROM students_login sl
      JOIN students s ON sl.student_id = s.id
    `;

    const params = [];

    // Add date filter if provided
    if (startDate && endDate) {
      sql += ` WHERE DATE(sl.login_time) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
      
      console.log('[getAllStudentLogInCounts] Date filter applied', {
        timestamp: new Date().toISOString(),
        startDate,
        endDate,
        dateRange: `${startDate} to ${endDate}`
      });
    }

    sql += ` ORDER BY sl.login_time DESC`;

    const [logins] = await db.query(sql, params);

    // Calculate analytics
    const uniqueStudents = new Set(logins.map(l => l.student_id)).size;
    const uniqueDates = new Set(logins.map(l => l.login_date)).size;
    
    const sectionBreakdown = logins.reduce((acc, login) => {
      acc[login.section] = (acc[login.section] || 0) + 1;
      return acc;
    }, {});

    const dateBreakdown = logins.reduce((acc, login) => {
      const date = login.login_date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const loginRate = totalStudents > 0 
      ? ((uniqueStudents / totalStudents) * 100).toFixed(2) 
      : '0.00';

    const avgLoginsPerDay = uniqueDates > 0 
      ? (logins.length / uniqueDates).toFixed(2) 
      : '0.00';

    console.log('[getAllStudentLogInCounts] Request successful', {
      timestamp: new Date().toISOString(),
      totalStudents,
      totalLogins: logins.length,
      uniqueStudents,
      uniqueDates,
      loginRate: `${loginRate}%`,
      avgLoginsPerDay,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all time',
      sectionBreakdown,
      topSection: Object.entries(sectionBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      mostActiveDate: Object.entries(dateBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      duration: `${Date.now() - startTime}ms`
    });

    // 3️⃣ Return raw data (filtering done on frontend)
    return res.status(200).json({
      totalStudents,
      logins
    });
  } catch (err) {
    console.error('[getAllStudentLogInCounts] Request failed', {
      timestamp: new Date().toISOString(),
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      error: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.insertStudentLogin = async (req, res) => {
  const startTime = Date.now();
  try {
    const { student_id } = req.body;

    console.log('[insertStudentLogin] Login attempt started', {
      timestamp: new Date().toISOString(),
      student_id,
      ip: req.ip
    });

    if (!student_id) {
      console.warn('[insertStudentLogin] Validation failed - missing student_id', {
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      return res.status(400).json({ message: "student_id is required" });
    }

    // 1️⃣ Check if the student already logged in today
    const todayDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [existing] = await db.query(
      `SELECT id FROM students_login WHERE student_id = ? AND DATE(login_time) = ?`,
      [student_id, todayDate]
    );

    if (existing.length > 0) {
      console.log('[insertStudentLogin] Duplicate login attempt - already logged in today', {
        timestamp: new Date().toISOString(),
        student_id,
        todayDate,
        existingLoginId: existing[0].id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(200).json({ message: "Student already logged in today" });
    }

    // 2️⃣ Insert new login record
    const [result] = await db.query(
      `INSERT INTO students_login (student_id) VALUES (?)`,
      [student_id]
    );

    console.log('[insertStudentLogin] Login recorded successfully', {
      timestamp: new Date().toISOString(),
      student_id,
      login_id: result.insertId,
      todayDate,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(201).json({ message: "Login recorded", login_id: result.insertId });
  } catch (err) {
    console.error('[insertStudentLogin] Login recording failed', {
      timestamp: new Date().toISOString(),
      student_id: req.body.student_id,
      error: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};