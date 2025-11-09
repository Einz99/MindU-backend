// File: controllers/studentController.js
const studentService = require('../services/studentService');
const db = require('../db');
const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to send welcome email
async function sendWelcomeEmail(student) {
  try {
    await resend.emails.send({
      from: 'MindU <onboarding@resend.dev>', // Use your verified domain later
      to: student.email,
      subject: 'Welcome to MindU',
      html: `
        <p>Welcome ${student.firstName} ${student.lastName},</p>
        <p>Your account has been created successfully.</p>
        <p>Your temporary password is <strong>${student.randomPassword}</strong>. Please change it immediately.</p>
        <p>Best regards,</p>
        <p>The MindU Team</p>
        <p><em>Note: This is an automated message, please do not reply.</em></p>
      `,
    });
    console.log(`Welcome email sent to ${student.email}`);
  } catch (error) {
    console.error(`Failed to send welcome email to ${student.email}:`, error);
    // Don't throw - we don't want email failure to break student creation
  }
}

exports.getAllStudents = async (req, res) => {
  try {
    const students = await studentService.getAllStudents();
    return res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.status(200).json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      section,
      adviser,
      adding_name,
      adding_position
    } = req.body;

    const newStudent = await studentService.createStudent(req.body);

    // Prepare the activity message
    const message = `${adding_position}: ${adding_name} added a student ${firstName} ${lastName}, section: ${section} advisory class of ${adviser}`;

    // Insert message into ActivityLog
    await db.query(
      `INSERT INTO ActivityLog (message) VALUES (?)`,
      [message]
    );

    // Send welcome email asynchronously (don't block response)
    sendWelcomeEmail(newStudent).catch(err => {
      console.error('Email sending failed, but student created:', err);
    });

    return res.status(201).json({
      message: "Student created successfully",
      student: newStudent,
    });
  } catch (error) {
    console.error("Error creating student:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    let updatedData = req.body;

    if (req.file) {
      updatedData.profilePic = `/resources/${req.file.filename}`;
    }

    const updated = await studentService.updateStudent(id, updatedData);
    if (!updated) {
      return res.status(404).json({ message: "Student not found" });
    }

    const {
      firstName,
      lastName,
      section,
      adviser,
      adding_name,
      adding_position
    } = req.body;

    if (adding_name && adding_position) {
      const message = `${adding_position}: ${adding_name} updated a student ${firstName} ${lastName}, section: ${section} advisory class of ${adviser}`;
      await db.query(
        `INSERT INTO ActivityLog (message) VALUES (?)`,
        [message]
      );
    }

    return res.status(200).json({ message: "Student updated successfully" });
  } catch (error) {
    console.error("Error updating student:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const staffName = req.query.staffName || "Unknown";
    const staffPosition = req.query.staffPosition || "Unknown";

    // Get the student details before deletion
    const [rows] = await db.query('SELECT firstName, lastName, section, adviser FROM students WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = rows[0];

    // Delete the student
    const [deleteResult] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Create the log message
    const message = `${staffPosition}: ${staffName} removed a student ${student.firstName} ${student.lastName}, section: ${student.section} advisory class of ${student.adviser}`;

    // Insert into ActivityLog
    await db.query('INSERT INTO ActivityLog (message) VALUES (?)', [message]);

    return res.status(200).json({ message: "Student deleted successfully" });

  } catch (error) {
    console.error("Error deleting student:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.bulkInsertStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "Invalid request. Provide an array of students." });
    }

    const result = await studentService.bulkInsertStudents(students);

    return res.status(200).json({
      message: `${result.insertedCount} students inserted successfully.`,
      skipped: result.skippedCount > 0 
        ? `${result.skippedCount} students were skipped because they already exist.` 
        : "No duplicates found.",
    });
  } catch (error) {
    console.error("Error inserting students in bulk:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};