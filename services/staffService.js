// services/staffService.js
const path = require("path");
const fs = require("fs");
const db = require("../db");
const bcrypt = require('bcrypt');
const crypto = require("crypto");


const UPLOAD_DIR = path.join(__dirname, "../resources/profile_pics");

exports.getAllStaffs = async () => {
  const [rows] = await db.query("SELECT * FROM staffs");
  return rows;
};

exports.getStaffById = async (id) => {
  const [rows] = await db.query("SELECT * FROM staffs WHERE ID = ?", [id]);
  return rows[0];
};

exports.createStaff = async (staffData) => {
  const { name, email, position, section } = staffData;
  const randomPassword = crypto.randomBytes(5).toString("hex");
  const password = bcrypt.hashSync(randomPassword, 10);
  const existingStaff = await db.query("SELECT * FROM staffs WHERE email = ?", [email]);
  if (existingStaff[0].length > 0) {
    throw new Error("Email already exists");
  }
  const passwordLength = randomPassword.length;
  const sql = `
    INSERT INTO staffs (name, email, password, position, section, passwordLength)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.query(sql, [name, email, password, position, section, passwordLength]);

  return {
    ID: result.insertId,
    name,
    email,
    randomPassword, // sent in email only
    position,
    section,
    created_at: new Date(),
    modified_at: new Date(),
  };
};

exports.updateStaff = async (id, staffData) => {
  const { name, email, password, position, section } = staffData;
  const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
  const passwordLength = password ? password.length : null;
  const sql = `
    UPDATE staffs 
    SET 
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      password = COALESCE(?, password),
      passwordLength = COALESCE(?, passwordLength),
      position = COALESCE(?, position),
      section = COALESCE(?, section), 
      modified_at = NOW()
    WHERE ID = ?
  `;
  const [result] = await db.query(sql, [name, email, hashedPassword, passwordLength, position, section, id]);
  return result.affectedRows; // returns 1 if updated, 0 if not found
}

exports.deleteStaff = async (id) => {
  const [result] = await db.query("DELETE FROM staffs WHERE ID = ?", [id]);
  return result.affectedRows; // returns 1 if deleted, 0 if not found
};

exports.updateStaffEmail = async (id, email) => {
  const sql = "UPDATE staffs SET email = ?, modified_at = NOW() WHERE ID = ?";
  const [result] = await db.query(sql, [email, id]);
  return result.affectedRows; // returns 1 if updated, 0 if not found
}

exports.updateStaffPassword = async (id, newPassword) => {
  try {
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

    const sql = `
      UPDATE staffs
      SET password = ?, passwordLength = ?, modified_at = NOW()
      WHERE id = ?
    `;

    await db.query(sql, [hashedNewPassword, newPassword.length, id]);
  } catch (error) {
    console.error("Failed to update password:", error);
    throw error; // Let controller handle the response
  }
};


exports.updateStaffPicture = async (id, newPictureFilename) => {
  // Step 1: Get current staff
  const [rows] = await db.query("SELECT picture FROM staffs WHERE ID = ?", [id]);
  if (rows.length === 0) return 0;

  const oldPicture = rows[0].picture;

  // Step 2: Update DB with new picture
  const sql = "UPDATE staffs SET picture = ?, modified_at = NOW() WHERE ID = ?";
  const [result] = await db.query(sql, [newPictureFilename, id]);

  // Step 3: Remove old picture from filesystem (only if it exists and is not null)
  if (oldPicture) {
    const oldPath = path.join(UPLOAD_DIR, oldPicture);
    fs.unlink(oldPath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("Failed to delete old picture:", err.message);
      }
    });
  }

  return result.affectedRows;
};

exports.getStaffByEmail = async (email) => {
  const sql = `SELECT * FROM staffs WHERE email = ? LIMIT 1`;
  const [rows] = await db.query(sql, [email]);
  return rows[0];
};

exports.checkUser = async (email) => {
  const sql = "SELECT * FROM staffs WHERE email = ?";
  const [result] = await db.query(sql, [email]);
  return result[0];
}

exports.updateForgotPassword = async (email, newPassword) => {
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const sql = `
    UPDATE staffs
    SET password = ?, passwordLength = ?, modified_at = NOW()
    WHERE email = ?
  `;
  const [result] = await db.query(sql, [hashedPassword, newPassword.length, email]);
  return result.affectedRows; // returns 1 if updated, 0 if not found
}