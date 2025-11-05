const express = require("express");
const router = express.Router();
const studentsLoginController = require("../controllers/studentsLoginController");

// GET all student logins with date range
router.get("/", studentsLoginController.getAllStudentLogInCounts);

// POST to insert new student login
router.post("/insert", studentsLoginController.insertStudentLogin);

module.exports = router;