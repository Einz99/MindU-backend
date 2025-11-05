const express = require("express");
const router = express.Router();
const studentActivityController = require("../controllers/studentActivityController");

// GET activities by date
router.get("/", studentActivityController.getActivitiesByStudent);
router.post("/:id/insert", studentActivityController.insertActivity);

module.exports = router;