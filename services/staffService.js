// services/staffService.js

const db = require("../db");

exports.getAllStaffs = async () => {
  const [rows] = await db.query("SELECT * FROM staffs");
  return rows;
};

exports.getStaffById = async (id) => {
  const [rows] = await db.query("SELECT * FROM staffs WHERE ID = ?", [id]);
  return rows[0];
};

exports.createStaff = async (staffData) => {
  const { name, email, password, position } = staffData;
  
  const sql = `
    INSERT INTO staffs (name, email, password, position)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await db.query(sql, [name, email, password, position]);

  return {
    ID: result.insertId,
    name,
    email,
    password,
    position,
    created_at: new Date(),
    modified_at: new Date(),
  };
};

exports.updateStaff = async (id, staffData) => {
  const { name, email, password, position } = staffData;
  
  const sql = `
    UPDATE staffs 
    SET 
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      password = COALESCE(?, password),
      position = COALESCE(?, position),
      modified_at = NOW()
    WHERE ID = ?
  `;
  const [result] = await db.query(sql, [name, email, password, position, id]);
  return result.affectedRows; // returns 1 if updated, 0 if not found
};

exports.deleteStaff = async (id) => {
  const [result] = await db.query("DELETE FROM staffs WHERE ID = ?", [id]);
  return result.affectedRows; // returns 1 if deleted, 0 if not found
};
