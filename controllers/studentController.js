// File: controllers/studentController.js
const studentService = require('../services/studentService');
const db = require('../db');
const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

console.log('Resend API Key exists:', !!process.env.RESEND_API_KEY);
console.log('Resend API Key starts with:', process.env.RESEND_API_KEY?.substring(0, 10));

// Helper function to send welcome email
async function sendWelcomeEmail(student) {
  console.log('[sendWelcomeEmail] STARTING email send', {
    timestamp: new Date().toISOString(),
    email: student.email,
    name: `${student.firstName} ${student.lastName}`,
    section: student.section,
    hasRandomPassword: !!student.randomPassword,
    randomPasswordValue: student.randomPassword, // Temporary - remove after debugging
    hasResendKey: !!process.env.RESEND_API_KEY
  });

  if (!student.randomPassword) {
    console.error('[sendWelcomeEmail] ERROR: No randomPassword provided!', {
      timestamp: new Date().toISOString(),
      studentKeys: Object.keys(student)
    });
    return;
  }

  try {
    console.log('[sendWelcomeEmail] About to call resend.emails.send...');
    
    const result = await resend.emails.send({
      from: 'MindU <onboarding@mind-u.space>',
      to: student.email,
      subject: 'Welcome to MindU',
      html: `
        <p>Welcome ${student.firstName} ${student.lastName},</p>
        <p>Your account has been created successfully.</p>
        <p>Your temporary password is <strong>${student.randomPassword}</strong>. Please change it immediately.</p>
        <p>You can download the application:</p>
        <a href="https://drive.google.com/uc?export=download&id=1XNv6eBFOb9sGGWu5VHIGIg_ZBCED4oyy" target="_blank">Download APK</a>
        <p>Best regards,</p>
        <p>The MindU Team</p>
        <p><em>Note: This is an automated message, please do not reply.</em></p>
      `,
    });
    
    console.log('[sendWelcomeEmail] Resend API response:', {
      timestamp: new Date().toISOString(),
      email: student.email,
      result: result
    });
    
    console.log('[sendWelcomeEmail] Welcome email sent successfully', {
      timestamp: new Date().toISOString(),
      email: student.email
    });
  } catch (error) {
    console.error('[sendWelcomeEmail] DETAILED ERROR:', {
      timestamp: new Date().toISOString(),
      email: student.email,
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorResponse: error.response?.data,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    });
  }
}

exports.getAllStudents = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[getAllStudents] Request started', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    const students = await studentService.getAllStudents();
    
    // Calculate statistics
    const sectionStats = students.reduce((acc, s) => {
      acc[s.section] = (acc[s.section] || 0) + 1;
      return acc;
    }, {});

    const adviserStats = students.reduce((acc, s) => {
      acc[s.adviser] = (acc[s.adviser] || 0) + 1;
      return acc;
    }, {});

    console.log('[getAllStudents] Request successful', {
      timestamp: new Date().toISOString(),
      studentCount: students.length,
      sectionCount: Object.keys(sectionStats).length,
      adviserCount: Object.keys(adviserStats).length,
      sectionBreakdown: sectionStats,
      largestSection: Object.entries(sectionStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(students);
  } catch (error) {
    console.error('[getAllStudents] Request failed', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    
    console.log('[getStudentById] Request started', {
      timestamp: new Date().toISOString(),
      student_id: id,
      ip: req.ip
    });

    const student = await studentService.getStudentById(id);
    
    if (!student) {
      console.warn('[getStudentById] Student not found', {
        timestamp: new Date().toISOString(),
        student_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Student not found" });
    }
    
    console.log('[getStudentById] Request successful', {
      timestamp: new Date().toISOString(),
      student_id: id,
      name: `${student.firstName} ${student.lastName}`,
      section: student.section,
      adviser: student.adviser,
      email: student.email,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(student);
  } catch (error) {
    console.error('[getStudentById] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      firstName,
      lastName,
      email,
      section,
      adviser,
      adding_name,
      adding_position
    } = req.body;

    console.log('[createStudent] Request started', {
      timestamp: new Date().toISOString(),
      firstName,
      lastName,
      email,
      section,
      adviser,
      adding_name,
      adding_position,
      ip: req.ip
    });

    const newStudent = await studentService.createStudent(req.body);

    // Prepare the activity message
    const message = `${adding_position}: ${adding_name} added a student ${firstName} ${lastName}, section: ${section} advisory class of ${adviser}`;

    // Insert message into ActivityLog
    await db.query(
      `INSERT INTO ActivityLog (message) VALUES (?)`,
      [message]
    );
    
    console.log('[createStudent] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: message
    });

    // Send welcome email asynchronously
    sendWelcomeEmail(newStudent).catch(err => {
      console.error('[createStudent] Email sending failed after student creation', {
        timestamp: new Date().toISOString(),
        student_id: newStudent.id,
        email: newStudent.email,
        error: err.message
      });
    });

    console.log('[createStudent] Request successful', {
      timestamp: new Date().toISOString(),
      student_id: newStudent.id,
      name: `${firstName} ${lastName}`,
      email: newStudent.email,
      section,
      adviser,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(201).json({
      message: "Student created successfully",
      student: newStudent,
    });
  } catch (error) {
    console.error('[createStudent] Request failed', {
      timestamp: new Date().toISOString(),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      section: req.body.section,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    let updatedData = req.body;

    console.log('[updateStudent] Request started', {
      timestamp: new Date().toISOString(),
      student_id: id,
      hasProfilePic: !!req.file,
      updates: Object.keys(req.body).filter(k => !k.startsWith('adding_')),
      updating_by: {
        name: req.body.adding_name,
        position: req.body.adding_position
      },
      ip: req.ip
    });

    if (req.file) {
      updatedData.profilePic = `/resources/${req.file.filename}`;
      
      console.log('[updateStudent] Profile picture uploaded', {
        timestamp: new Date().toISOString(),
        student_id: id,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    }

    const updated = await studentService.updateStudent(id, updatedData);
    
    if (!updated) {
      console.warn('[updateStudent] Student not found', {
        timestamp: new Date().toISOString(),
        student_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
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
      
      console.log('[updateStudent] Activity logged', {
        timestamp: new Date().toISOString(),
        activityMessage: message
      });
    }

    console.log('[updateStudent] Request successful', {
      timestamp: new Date().toISOString(),
      student_id: id,
      name: firstName && lastName ? `${firstName} ${lastName}` : 'not updated',
      updatedFields: Object.keys(updatedData).filter(k => !k.startsWith('adding_')),
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Student updated successfully" });
  } catch (error) {
    console.error('[updateStudent] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const staffName = req.query.staffName || "Unknown";
    const staffPosition = req.query.staffPosition || "Unknown";

    console.log('[deleteStudent] Request started', {
      timestamp: new Date().toISOString(),
      student_id: id,
      deleting_by: { staffName, staffPosition },
      ip: req.ip
    });

    // Get the student details before deletion
    const [rows] = await db.query('SELECT firstName, lastName, section, adviser FROM students WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      console.warn('[deleteStudent] Student not found', {
        timestamp: new Date().toISOString(),
        student_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Student not found" });
    }

    const student = rows[0];

    // Delete the student
    const [deleteResult] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    
    if (deleteResult.affectedRows === 0) {
      console.warn('[deleteStudent] Delete operation failed', {
        timestamp: new Date().toISOString(),
        student_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Student not found" });
    }

    // Create the log message
    const message = `${staffPosition}: ${staffName} removed a student ${student.firstName} ${student.lastName}, section: ${student.section} advisory class of ${student.adviser}`;

    // Insert into ActivityLog
    await db.query('INSERT INTO ActivityLog (message) VALUES (?)', [message]);
    
    console.log('[deleteStudent] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: message
    });

    console.log('[deleteStudent] Request successful', {
      timestamp: new Date().toISOString(),
      student_id: id,
      deleted_name: `${student.firstName} ${student.lastName}`,
      section: student.section,
      adviser: student.adviser,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Student deleted successfully" });

  } catch (error) {
    console.error('[deleteStudent] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.params.id,
      staffName: req.query.staffName,
      staffPosition: req.query.staffPosition,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.bulkInsertStudents = async (req, res) => {
  const startTime = Date.now();
  try {
    const { students } = req.body;

    console.log('[bulkInsertStudents] Bulk insert started', {
      timestamp: new Date().toISOString(),
      count: students?.length || 0,
      ip: req.ip
    });

    if (!Array.isArray(students) || students.length === 0) {
      console.warn('[bulkInsertStudents] Validation failed - invalid data', {
        timestamp: new Date().toISOString(),
        isArray: Array.isArray(students),
        count: students?.length || 0
      });
      
      return res.status(400).json({ message: "Invalid request. Provide an array of students." });
    }

    // Sample data for logging (first few students)
    const sampleStudents = students.slice(0, 3).map(s => ({
      name: `${s.firstName} ${s.lastName}`,
      section: s.section,
      email: s.email
    }));

    console.log('[bulkInsertStudents] Sample data', {
      timestamp: new Date().toISOString(),
      totalCount: students.length,
      samples: sampleStudents
    });

    const result = await studentService.bulkInsertStudents(students);

    // Calculate section distribution
    const sectionDistribution = students.reduce((acc, s) => {
      acc[s.section] = (acc[s.section] || 0) + 1;
      return acc;
    }, {});

    console.log('[bulkInsertStudents] Bulk insert completed', {
      timestamp: new Date().toISOString(),
      totalRequested: students.length,
      insertedCount: result.insertedCount,
      skippedCount: result.skippedCount,
      successRate: `${((result.insertedCount / students.length) * 100).toFixed(2)}%`,
      sectionDistribution,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({
      message: `${result.insertedCount} students inserted successfully.`,
      skipped: result.skippedCount > 0 
        ? `${result.skippedCount} students were skipped because they already exist.` 
        : "No duplicates found.",
    });
  } catch (error) {
    console.error('[bulkInsertStudents] Bulk insert failed', {
      timestamp: new Date().toISOString(),
      count: req.body.students?.length || 0,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};