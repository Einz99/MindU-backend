const db = require('../db');
const crypto = require("crypto");
// const bcrypt = require("bcrypt");

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

  const sql = `
    INSERT INTO students 
      (password, lastName, firstName, adviser, age, gender, email, section)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.query(sql, [
    randomPassword, // Store generated password
    lastName,
    firstName,
    adviser,
    age,
    gender,
    email,
    section,
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
    generatedPassword: randomPassword, // Return generated password for admin reference
    firstLogin: true,
    created_at: new Date(),
    modified_at: new Date(),
  };
};


// change if encryption is required delete the other createStudents
// exports.createStudent = async (studentData) => {
//   const {
//     username,
//     lastName,
//     firstName,
//     adviser,
//     age,
//     gender,
//     email,
//   } = studentData;

//   // Generate a random 10-character password
//   const randomPassword = crypto.randomBytes(5).toString("hex"); // 10 characters

//   // Hash the password before storing
//   const hashedPassword = await bcrypt.hash(randomPassword, 10); // 10 rounds of salt

//   const sql = `
//     INSERT INTO students 
//       (username, password, lastName, firstName, adviser, age, gender, email)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//   `;
//   const [result] = await db.query(sql, [
//     username,
//     hashedPassword, // Store hashed password instead of plain text
//     lastName,
//     firstName,
//     adviser,
//     age,
//     gender,
//     email,
//   ]);

//   return {
//     id: result.insertId,
//     username,
//     lastName,
//     firstName,
//     adviser,
//     age,
//     gender,
//     email,
//     generatedPassword: randomPassword, // Provide the generated password to be sent securely
//     firstLogin: true,
//     created_at: new Date(),
//     modified_at: new Date(),
//   };
// };


exports.updateStudent = async (id, studentData) => {
  const {
    username,    // updated username if needed
    password,
    lastName,
    firstName,
    adviser,
    age,
    gender,
    email,
  } = studentData;

  const sql = `
    UPDATE students 
    SET 
      username = COALESCE(?, username),
      password = COALESCE(?, password),
      lastName = COALESCE(?, lastName),
      firstName = COALESCE(?, firstName),
      adviser = COALESCE(?, adviser),
      age = COALESCE(?, age),
      gender = COALESCE(?, gender),
      email = COALESCE(?, email),
      modified_at = NOW(),
      firstLogin = false
    WHERE id = ?
  `;
  const [result] = await db.query(sql, [
    username,
    password,
    lastName,
    firstName,
    adviser,
    age,
    gender,
    email,
    id,
  ]);

  return result.affectedRows; // returns 1 if updated, 0 if not found
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

  // Ensure valid format
  const formattedStudents = students.map(student => ({
    firstName: student.firstName || null,
    lastName: student.lastName || null,
    section: student.section || null,
    adviser: student.adviser || null,
    email: student.email || null,
    password: crypto.randomBytes(5).toString("hex"), // Generate random password
  }));

  // Extract unique emails from request
  const emails = formattedStudents.map(s => s.email).filter(email => email); // Ignore empty emails
  if (emails.length === 0) throw new Error("No valid emails provided.");

  // Check if emails already exist
  const [existingStudents] = await db.query(
    "SELECT email FROM students WHERE email IN (?)",
    [emails]
  );
  const existingEmails = new Set(existingStudents.map(s => s.email));

  // Filter out existing students by email
  const validStudents = formattedStudents.filter(student => !existingEmails.has(student.email));

  if (validStudents.length === 0) {
    return { insertedCount: 0, skippedCount: students.length, message: "All students already exist." };
  }

  // Insert valid students
  const sql = `
    INSERT INTO students (firstName, lastName, section, adviser, email, password)
    VALUES ?
  `;
  const values = validStudents.map(s => [s.firstName, s.lastName, s.section, s.adviser, s.email, s.password]);
  const [result] = await db.query(sql, [values]);

  return {
    insertedCount: result.affectedRows,
    skippedCount: students.length - validStudents.length,
  };
};