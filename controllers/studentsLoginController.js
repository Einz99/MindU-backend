// controllers/studentsLoginController.js
const db = require("../db");

exports.getAllStudentLogInCounts = async (req, res) => {
  try {
    const { date } = req.query; // optional selected date, format YYYY-MM-DD

    // 1️⃣ Fetch total students
    const [totalRows] = await db.query(`SELECT COUNT(*) AS total FROM students`);
    const totalStudents = totalRows[0]?.total || 0;

    // 2️⃣ Helper: get unique logins for a given day
    const getUniqueLogins = async (day) => {
      const [rows] = await db.query(
        `SELECT COUNT(DISTINCT student_id) AS logged 
         FROM students_login 
         WHERE DATE(login_time) = ?`,
        [day]
      );
      return rows[0]?.logged || 0;
    };

    // 3️⃣ Determine dates
    const todayDate = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const selectedDate = date || todayDate;

    // 4️⃣ Get counts
    const todayStudents = await getUniqueLogins(todayDate);
    const yesterdayStudents = await getUniqueLogins(yesterdayDate);
    const selectedDayStudents = await getUniqueLogins(selectedDate);

    // 5️⃣ Return raw counts
    return res.status(200).json({
      totalStudents,
      today: todayStudents,
      yesterday: yesterdayStudents,
      selectedDay: selectedDayStudents,
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