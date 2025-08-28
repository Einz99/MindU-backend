const express = require('express');
const router = express.Router();
const db = require('../db'); // your database connection

// Save message to chatbot history
router.post('/save-message', async (req, res) => {
  const { student_id, is_from_bot, message } = req.body;

  if (!student_id || message === undefined || is_from_bot === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await db.query(
      'INSERT INTO chatbot_history (student_id, is_from_bot, message) VALUES (?, ?, ?)',
      [student_id, is_from_bot, message]
    );
    res.status(200).json({ message: 'Message saved' });
  } catch (err) {
    console.error('DB insert error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;