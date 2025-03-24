const multer = require('multer');
const path = require('path');
const studentService = require('../services/studentService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'resources/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});


const upload = multer({ storage });

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
    const newStudent = await studentService.createStudent(req.body);
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
    return res.status(200).json({ message: "Student updated successfully" });
  } catch (error) {
    console.error("Error updating student:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await studentService.deleteStudent(id);
    if (!deleted) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMultipleStudents = async (req, res) => {
  try {
    const { ids } = req.body; // Expecting an array of student IDs

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid request: Provide an array of student IDs." });
    }

    const deletedCount = await studentService.deleteMultipleStudents(ids);
    if (deletedCount === 0) {
      return res.status(404).json({ message: "No students found to delete." });
    }

    return res.status(200).json({ message: `${deletedCount} students deleted successfully.` });
  } catch (error) {
    console.error("Error deleting multiple students:", error);
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

    return res.status(201).json({
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
