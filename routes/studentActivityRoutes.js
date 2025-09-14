const express = require("express");
const router = express.Router();
const studentActivityController = require("../controllers/studentActivityController");

// GET activities by date
router.get("/", studentActivityController.getActivitiesByDate);
router.post("/insert", studentActivityController.insertActivity);

module.exports = router;