const db = require("../db"); // adjust path to your db connection

exports.getActivitiesByDate = async (date) => {
  const sql = `
    SELECT module, COUNT(*) AS visits
    FROM studentActivityLog
    WHERE DATE(created_at) = ?
    GROUP BY module;
  `;

  const [rows] = await db.query(sql, [date]);
  return rows;
};
