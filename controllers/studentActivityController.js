const db = require("../db");

exports.getActivitiesByStudent = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

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
    }

    sql += `
      GROUP BY DATE(sal.created_at), sal.module, s.section
      ORDER BY DATE(sal.created_at) DESC;
    `;
    
    const [rows] = await db.query(sql, params);
    
    // Return all activities (filtering done on frontend)
    res.json({ activities: rows });
  } catch (err) {
    console.error("Error getting activities:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.insertActivity = async (req, res) => {
  try {
    const student_id = req.params.id;
    const { module } = req.body;

    if (!student_id || !module) {
      return res.status(400).json({ message: "Student ID and Module are required" });
    }

    const allowedModules = ['Resource', 'Wellness', 'Chatbot', 'Mood', 'Scheduler', 'Pet'];
    if (!allowedModules.includes(module)) {
      return res.status(400).json({ message: "Invalid module" });
    }

    await db.query(
      `INSERT INTO studentActivityLog (student_id, module) VALUES (?, ?)`,
      [student_id, module]
    );

    return res.status(201).json({ message: "Activity logged successfully" });
  } catch (err) {
    console.error("Error inserting activity:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};