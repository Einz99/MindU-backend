const db = require("../db");

exports.getAllStudentLogInCounts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 1️⃣ Fetch total students count
    const [totalRows] = await db.query(`SELECT COUNT(*) AS total FROM students`);
    const totalStudents = totalRows[0]?.total || 0;

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
    }

    sql += ` ORDER BY sl.login_time DESC`;

    const [logins] = await db.query(sql, params);

    // 3️⃣ Return raw data (filtering done on frontend)
    return res.status(200).json({
      totalStudents,
      logins
    });
  } catch (err) {
    console.error("Error fetching login counts:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.insertStudentLogin = async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ message: "student_id is required" });
    }

    // 1️⃣ Check if the student already logged in today
    const todayDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [existing] = await db.query(
      `SELECT id FROM students_login WHERE student_id = ? AND DATE(login_time) = ?`,
      [student_id, todayDate]
    );

    if (existing.length > 0) {
      return res.status(200).json({ message: "Student already logged in today" });
    }

    // 2️⃣ Insert new login record
    const [result] = await db.query(
      `INSERT INTO students_login (student_id) VALUES (?)`,
      [student_id]
    );

    return res.status(201).json({ message: "Login recorded", login_id: result.insertId });
  } catch (err) {
    console.error("Error inserting student login:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};