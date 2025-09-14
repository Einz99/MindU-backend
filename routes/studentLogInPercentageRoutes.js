const express = require("express");
const router = express.Router();
const studentsLoginController = require("../controllers/studentsLoginController");

router.get("/", studentsLoginController.getAllStudentLogInCounts);
router.post("/insert", studentsLoginController.insertStudentLogin); // NEW

module.exports = router;