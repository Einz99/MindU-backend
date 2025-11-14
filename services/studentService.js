const db = require('../db');
const crypto = require("crypto");
const { Resend } = require('resend');
// const bcrypt = require("bcrypt");

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

exports.getAllStudents = async () => {
  const [rows] = await db.query("SELECT * FROM students");
  return rows;
};

exports.getStudentById = async (id) => {
  const [rows] = await db.query("SELECT * FROM students WHERE id = ?", [id]);
  return rows[0];
};

exports.createStudent = async (studentData) => {
  const {
    lastName,
    firstName,
    adviser,
    age,
    gender,
    email,
    section,
  } = studentData;

  // Generate a random 10-character password
  const randomPassword = crypto.randomBytes(5).toString("hex"); // 10 characters
  //   const hashedPassword = await bcrypt.hash(randomPassword, 10); // 10 rounds of salt
  const passwordLength = randomPassword.length;

  const sql = `
    INSERT INTO students 
      (password, lastName, firstName, adviser, age, gender, email, section)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  /*
  const sql = `
    INSERT INTO students 
      (password, lastName, firstName, adviser, age, gender, email, section, passwordLength)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  */

  const [result] = await db.query(sql, [
    randomPassword, // Store generated password
    //hashedPassword,
    lastName,
    firstName,
    adviser,
    age,
    gender,
    email,
    section,
    // passwordLength,
  ]);

  return {
    id: result.insertId,
    lastName,
    firstName,
    adviser,
    age,
    gender,
    email,
    section,
    randomPassword,
    firstLogin: true,
    created_at: new Date(),
    modified_at: new Date(),
  };
};

exports.updateStudent = async (id, studentData) => {
  const {
    password,
    lastName,
    firstName,
    adviser,
    section,
    email,
  } = studentData;

  let passwordLength = null;
  let hashedPassword = null;

  if (password) {
    //const bcrypt = require('bcrypt'); // Ensure bcrypt is imported
    //hashedPassword = await bcrypt.hash(password, 10);
    passwordLength = password.length;
  }

  const sql = `
    UPDATE students 
    SET 
      password = COALESCE(?, password),
      lastName = COALESCE(?, lastName),
      firstName = COALESCE(?, firstName),
      adviser = COALESCE(?, adviser),
      email = COALESCE(?, email),
      section = COALESCE(?, section),
      modified_at = NOW(),
      firstLogin = false,
      passwordLength = COALESCE(?, passwordLength)
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [
    password, //hashedPassword
    lastName,
    firstName,
    adviser,
    email,
    section,
    passwordLength,
    id,
  ]);

  return result.affectedRows;
};

exports.deleteStudent = async (id) => {
  const [result] = await db.query("DELETE FROM students WHERE id = ?", [id]);
  return result.affectedRows;
};

exports.deleteMultipleStudents = async (ids) => {
  const sql = `DELETE FROM students WHERE id IN (?)`; // Use IN() for bulk deletion
  const [result] = await db.query(sql, [ids]);

  return result.affectedRows; // Number of rows deleted
};

exports.bulkInsertStudents = async (students) => {
  if (!Array.isArray(students) || students.length === 0) {
    throw new Error("Invalid student data.");
  }

  // 1. Get all advisers with their section
  const [advisers] = await db.query(
    "SELECT name, section FROM staffs WHERE position = 'Adviser' AND section IS NOT NULL"
  );
  const sectionToAdviserMap = new Map(advisers.map(a => [a.section, a.name]));

  // 2. Prepare students with adviser auto-assigned and passwords
  const formattedStudents = students.map(student => {
    const password = crypto.randomBytes(5).toString("hex");
    const adviserName = sectionToAdviserMap.get(student.section) || null;

    return {
      firstName: student.firstName || null,
      lastName: student.lastName || null,
      section: student.section || null,
      adviser: adviserName,
      email: student.email || null,
      password,
      randomPassword: password, // Keep for email use
    };
  });

  const emails = formattedStudents.map(s => s.email).filter(email => email);
  if (emails.length === 0) throw new Error("No valid emails provided.");

  // 3. Check for existing emails
  const [existingStudents] = await db.query(
    "SELECT email FROM students WHERE email IN (?)",
    [emails]
  );
  const existingEmails = new Set(existingStudents.map(s => s.email));

  // 4. Filter only new students
  const newStudents = formattedStudents.filter(s => !existingEmails.has(s.email));
  if (newStudents.length === 0) {
    return {
      insertedCount: 0,
      skippedCount: students.length,
      message: "All students already exist.",
    };
  }

  // 5. Bulk insert
  const sql = `
    INSERT INTO students (firstName, lastName, section, adviser, email, password)
    VALUES ?
  `;
  const values = newStudents.map(s => [
    s.firstName,
    s.lastName,
    s.section,
    s.adviser,
    s.email,
    s.password,
  ]);
  const [result] = await db.query(sql, [values]);

  // 6. Send email to each new student using Resend
  for (const student of newStudents) {
    try {
      await resend.emails.send({
        from: 'MindU <onboarding@resend.dev>',
        to: student.email,
        subject: 'Welcome to MindU',
        html: `
          <p>Welcome <strong>${student.firstName} ${student.lastName}</strong>,</p>
          <p>Your account has been <strong>created successfully</strong>.</p>
          <p><strong>Temporary Password:</strong> <code>${student.randomPassword}</code></p>
          <p>Please change your password as soon as possible after logging in.</p>
          <hr/>
          <p><em>This is an automated message. Please do not reply.</em></p>
          <p>— The MindU Team</p>
        `,
      });
      console.log(`[bulkInsertStudents] Welcome email sent to: ${student.email}`);
    } catch (emailError) {
      console.error(`[bulkInsertStudents] Failed to send email to ${student.email}:`, emailError);
      // Continue processing even if email fails
    }
  }

  return {
    insertedCount: result.affectedRows,
    skippedCount: students.length - newStudents.length,
  };
};