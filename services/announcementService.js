// services/announcementService.js

const db = require("../db");

exports.getAllAnnouncements = async () => {
  const [rows] = await db.query("SELECT * FROM announcements ORDER BY created_at");
  return rows;
};

exports.getAnnouncementById = async (id) => {
  const [rows] = await db.query("SELECT * FROM announcements WHERE ID = ?", [id]);
  return rows[0];
};

exports.createAnnouncement = async (announcementData) => {
  const { title, category, announcementContent, end_date } = announcementData;
  
  const sql = `
    INSERT INTO announcements (title, category, announcementContent, end_date)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await db.query(sql, [title, category, announcementContent, end_date]);

  return {
    ID: result.insertId,
    title,
    category,
    announcementContent,
    end_date,
    created_at: new Date(),
    modified_at: new Date(),
  };
};

exports.updateAnnouncement = async (id, announcementData) => {
  const { title, category, announcementContent, end_date } = announcementData;
  const sql = `
    UPDATE announcements 
    SET 
      title = COALESCE(?, title),
      category = COALESCE(?, category),
      announcementContent = COALESCE(?, announcementContent),
      end_date = COALESCE(?, end_date),
      modified_at = NOW()
    WHERE ID = ?
  `;
  const [result] = await db.query(sql, [title, category, announcementContent, end_date, id]);
  return result.affectedRows;
};

exports.deleteAnnouncement = async (id) => {
  const [result] = await db.query("DELETE FROM announcements WHERE ID = ?", [id]);
  return result.affectedRows;
};

exports.deleteMultipleAnnouncements = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid input: IDs must be a non-empty array.");
  }

  const sql = `DELETE FROM announcements WHERE ID IN (?)`;
  const [result] = await db.query(sql, [ids]);

  return result.affectedRows; // Returns number of deleted rows
};
