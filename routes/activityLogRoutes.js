const express = require("express");
const router = express.Router();
const db = require("../db");

// GET: Retrieve all activity logs (newest first)
router.get("/", (req, res) => {
  const query = "SELECT * FROM ActivityLog ORDER BY created_at DESC";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Failed to fetch activity logs:", err);
      return res.status(500).json({ success: false });
    }
    res.json(results);
  });
});

// POST: Insert a new activity log
router.post("/insert", (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ success: false });
  }

  const query = "INSERT INTO ActivityLog (message) VALUES (?)";
  db.query(query, [message], (err) => {
    if (err) {
      console.error("Failed to insert activity log:", err);
      return res.status(500).json({ success: false });
    }
    res.status(200).json({ success: true });
  });
});

module.exports = router;
