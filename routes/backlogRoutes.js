// routes/backlogRoutes.js
const express = require("express");
const router = express.Router();
const backlogController = require("../controllers/backlogController");

// Create a backlog event (for both student and admin)
router.post("/", backlogController.createBacklog);

// Update a backlog event (only admin allowed)
router.put("/:id", backlogController.updateBacklog);

// Retrieve backlog events
router.get("/", backlogController.getBacklogs);

module.exports = router;
