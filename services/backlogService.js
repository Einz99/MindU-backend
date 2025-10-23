// services/backlogService.js
const db = require("../db");
const fs = require("fs");
const path = require("path");

/**
 * Create a new backlog record.
 * @param {Object} data - The backlog data.
 * @returns {Promise<Object>} The created backlog record.
 */
exports.createBacklog = async (data) => {
  const query = `
    INSERT INTO backlogs 
      (student_id, staff_id, isStaffRequest, name, message, sched_date, status, created_at, modified_at, completed_at)
    VALUES ( ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
  `;
  const params = [
    data.student_id || null,
    data.staff_id || null,
    data.name || null,
    data.staffRequest || false,
    data.message || null,
    data.sched_date || null,
    data.status,
    data.completed_at || null,
  ];
  const [result] = await db.query(query, params);
  return { id: result.insertId, ...data };
}

/**
 * Update an existing backlog record.
 * @param {number} id - The backlog record ID.
 * @param {Object} updateData - The data to update.
 * @returns {Promise<Object>} The updated backlog record.
 */
exports.updateBacklog = async (id, updateData) => {
  let fields = [];
  let params = [];

  if (updateData.sched_date !== undefined) {
    fields.push("sched_date = ?");
    params.push(updateData.sched_date);
    updateData.status = "Scheduled"; // Ensure status changes when rescheduling
  }

  if (updateData.status !== undefined) {
    fields.push("status = ?");
    params.push(updateData.status);
  }

  fields.push("modified_at = NOW()");

  if (updateData.completed_at !== undefined) {
    fields.push("completed_at = ?");
    params.push(updateData.completed_at);
  }

  const query = `UPDATE backlogs SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);

  await db.query(query, params);
  return { id, ...updateData };
}

/**
 * Retrieve backlog records based on optional filters.
 * @param {Object} filter - Filter criteria (e.g. status, sched_date).
 * @returns {Promise<Array>} A list of backlog records.
 */
exports.getBacklogs = async (filter = {}) => {
  let query = "SELECT * FROM backlogs";
  let params = [];
  let conditions = [];

  if (filter.status) {
    conditions.push("status = ?");
    params.push(filter.status);
  }

  if (filter.sched_date) {
    conditions.push("DATE(sched_date) = DATE(?)");
    params.push(filter.sched_date);
  }

  if (conditions.length) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY sched_date ASC";
  const [rows] = await db.query(query, params);
  return rows;
}

/**
 * Delete a backlog record by its ID.
 * @param {number} id - The backlog record ID.
 * @returns {Promise<void>}
 */
exports.deleteBacklog = async (id) => {
  const query = "DELETE FROM backlogs WHERE id = ?";
  const params = [id];

  await db.query(query, params);
}


exports.updateProposalStatus = async (id, status, comment) => {
  const query = `
    UPDATE backlogs
    SET status = ?, comment = ?, modified_at = NOW()
    WHERE id = ?
  `;
  const params = [status, comment, id];

  await db.query(query, params);

  // Return updated object (for frontend convenience)
  return { id, status, comment };
};