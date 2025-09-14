// routes/backlogRoutes.js
const express = require("express");
const router = express.Router();
const backlogController = require("../controllers/backlogController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/request");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Create a backlog event (for both student and admin)
router.post("/", backlogController.createBacklog);

router.post("/request", upload.single("file"), backlogController.createRequest);

// Update a backlog event (only admin allowed)
router.put("/:id", backlogController.updateBacklog);

router.patch("/update-status/:id", backlogController.updateProposalStatus);

// Retrieve backlog events
router.get("/", backlogController.getBacklogs);

router.get("/student-requests/:staffId", backlogController.getRequestsByStaffId);
router.get("/staff-requests/:staffId", backlogController.getStaffRequestsByStaffId);

// Delete a backlog event (only admin allowed)
router.delete("/:id", backlogController.deleteBacklog); // Add this route

module.exports = router;