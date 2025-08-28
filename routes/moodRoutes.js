const express = require("express");
const router = express.Router();
const moodController = require("../controllers/moodController");

router.get('/:student_id', moodController.getMood);
router.post('/upsert', moodController.upsertMood);

module.exports = router;