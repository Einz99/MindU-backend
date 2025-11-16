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

const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(name) && name.trim().length > 0;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

    // Validate first name
    if (!firstName || !validateName(firstName)) {
      return res.status(400).json({ 
        message: "Invalid first name. Only letters, spaces, hyphens, and apostrophes are allowed." 
      });
    }

    // Validate last name
    if (!lastName || !validateName(lastName)) {
      return res.status(400).json({ 
        message: "Invalid last name. Only letters, spaces, hyphens, and apostrophes are allowed." 
      });
    }

    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ 
        message: "Invalid email format." 
      });
    }

    // Check for duplicate email
    const [existingStudent] = await db.query(
      'SELECT id FROM students WHERE email = ?',
      [email]
    );
    if (existingStudent.length > 0) {
      return res.status(400).json({ 
        message: "This email is already registered to another student." 
      });
    }

    // Validate section exists
    const [adviserCheck] = await db.query(
      'SELECT id FROM staffs WHERE section = ? AND position = "Adviser"',
      [section]
    );
    if (adviserCheck.length === 0) {
      return res.status(400).json({ 
        message: `Section "${section}" does not exist or has no adviser assigned.` 
      });
    }

    const newStudent = await studentService.createStudent(req.body);

    const message = `${adding_position}: ${adding_name} added a student ${firstName} ${lastName}, section: ${section} advisory class of ${adviser}`;
    await db.query(`INSERT INTO ActivityLog (message) VALUES (?)`, [message]);
    
    console.log('[createStudent] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: message
    });

    sendWelcomeEmail(newStudent).catch(err => {
      console.error('[createStudent] Email sending failed', {
        timestamp: new Date().toISOString(),
        student_id: newStudent.id,
        email: newStudent.email,
        error: err.message
      });
    });

    console.log('[createStudent] Request successful', {
      timestamp: new Date().toISOString(),
      student_id: newStudent.id,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(201).json({
      message: "Student created successfully",
      student: newStudent,
    });
  } catch (error) {
    console.error('[createStudent] Request failed', {
      timestamp: new Date().toISOString(),
      error: error.message,
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
      return res.status(400).json({ 
        message: "Invalid request. Provide an array of students." 
      });
    }

    // Get all existing emails
    const [existingEmails] = await db.query('SELECT email FROM students');
    const existingEmailSet = new Set(
      existingEmails.map(e => e.email.toLowerCase())
    );

    // Get all valid sections with their advisers
    const [validSections] = await db.query(
      'SELECT section, name as adviser FROM staffs WHERE position = "Adviser"'
    );
    const sectionAdviserMap = new Map();
    validSections.forEach(s => {
      sectionAdviserMap.set(s.section, s.adviser);
    });

    const errors = [];
    const validStudents = [];
    const seenEmails = new Set();

    // Use for...of instead of forEach to properly handle async/await
    for (let index = 0; index < students.length; index++) {
      const student = students[index];
      const rowNumber = index + 1;
      const rowErrors = [];

      // Validate first name
      if (!student.firstName || !validateName(student.firstName)) {
        rowErrors.push('Invalid first name');
      }

      // Validate last name
      if (!student.lastName || !validateName(student.lastName)) {
        rowErrors.push('Invalid last name');
      }

      // Validate email
      if (!student.email || !validateEmail(student.email)) {
        rowErrors.push('Invalid email format');
      } else {
        const emailLower = student.email.toLowerCase();
        if (existingEmailSet.has(emailLower)) {
          rowErrors.push('Email already exists');
        } else if (seenEmails.has(emailLower)) {
          rowErrors.push('Duplicate email in upload');
        } else {
          seenEmails.add(emailLower);
        }
      }

      // Validate section
      if (!student.section) {
        rowErrors.push('Section is required');
      } else if (!sectionAdviserMap.has(student.section)) {
        rowErrors.push(`Section "${student.section}" does not exist`);
      } else {
        // Auto-fill adviser based on section
        student.adviser = sectionAdviserMap.get(student.section);
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNumber} (${student.firstName || ''} ${student.lastName || ''}): ${rowErrors.join(', ')}`);
      } else {
        validStudents.push(student);
      }
    }

    console.log('[bulkInsertStudents] Validation completed', {
      timestamp: new Date().toISOString(),
      totalRows: students.length,
      validRows: validStudents.length,
      errorRows: errors.length
    });

    if (errors.length > 0 && validStudents.length === 0) {
      return res.status(400).json({
        message: "Bulk upload validation failed. All rows have errors.",
        errors: errors
      });
    }

    let insertedCount = 0;
    if (validStudents.length > 0) {
      const result = await studentService.bulkInsertStudents(validStudents);
      insertedCount = result.insertedCount;
    }

    console.log('[bulkInsertStudents] Bulk insert completed', {
      timestamp: new Date().toISOString(),
      totalRequested: students.length,
      insertedCount,
      errorCount: errors.length,
      duration: `${Date.now() - startTime}ms`
    });

    const responseMessage = errors.length > 0
      ? {
          message: `${insertedCount} students inserted successfully. ${errors.length} rows had errors.`,
          insertedCount,
          errors
        }
      : {
          message: `${insertedCount} students inserted successfully.`,
          insertedCount
        };

    return res.status(200).json(responseMessage);
  } catch (error) {
    console.error('[bulkInsertStudents] Bulk insert failed', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};