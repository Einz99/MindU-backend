const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const announceController = require("../controllers/announcementController");
const getResources = require("../controllers/resourcesController");

// Define routes and link them to controller functions
router.post("/login", authController.login);
router.get("/user", authController.getUser);
router.put("/update-profile", authController.updateProfile);
router.put("/update-password", authController.updatePassword);
router.post("/forgot-password", authController.forgotPassword);
router.get("/announcements", announceController.getAnnouncements);
router.get("/resources", getResources.getResources);
router.post("/refresh", authController.refreshToken);

module.exports = router;
