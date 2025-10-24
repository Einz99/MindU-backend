const db = require("../db");

exports.getMood = async (id) => {
  const [rows] = await db.query(
    `SELECT *
     FROM mood_data 
     WHERE student_id = ? 
     ORDER BY emotion_dated`,
    [id]
  );
  return rows;
};

exports.createMood = async (data) => {
  const query = `
    INSERT INTO mood_data 
      (student_id, emotion, emotion_dated, created_at, modified_at)
    VALUES (?, ?, ?, NOW(), NOW());
  `
  const params = [
    data.id,
    data.mood,
    data.emotion_dated, // should be in 'YYYY-MM-DD' format
  ]
  const [result] = await db.query(query, params);
  return {id: result.insertId, ...data}
}

exports.updateMood = async (data) => {
  const query = `
    UPDATE mood_data
    SET emotion = ?, modified_at = NOW()
  `;
  
  const [result] = await db.query(query, [
    data.mood, 
    data.student_id, 
    data.emotion_dated  // Changed from emotion_date
  ]);
  return result.affectedRows;
};

exports.getMoodByDate = async (student_id, emotion_date) => {
  const [rows] = await db.query(
    `SELECT * FROM mood_data WHERE student_id = ? AND emotion_dated = ? LIMIT 1`,
    [student_id, emotion_date]
  );
  return rows.length > 0 ? rows[0] : null;
};