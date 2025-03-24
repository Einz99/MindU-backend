// controllers/backlogController.js
const backlogService = require("../services/backlogService");
const db = require("../db");

/**
 * Create a new backlog record.
 * - If a student_id is provided then it is a student-created request:
 *    - title: "Request Meeting"
 *    - sched_date: forced to null
 *    - status: "Pending"
 *    - name: fetched from the students table (firstName + " " + lastName)
 * - Otherwise, it is an admin-created event:
 *    - title: "Guidance Related Events"
 *    - sched_date must be provided
 *    - status: "Scheduled"
 *    - name: provided in the request (from guidance)
 */
async function createBacklog(req, res) {
  try {
    const data = req.body;
    
    if (data.student_id) {
      // Student creation
      data.title = "Request Meeting";
      data.sched_date = null;
      data.status = "Pending";
      // Lookup student's firstName and lastName from the students table.
      const [rows] = await db.query(
        "SELECT firstName, lastName FROM students WHERE id = ?",
        [data.student_id]
      );
      if (rows.length > 0) {
        const student = rows[0];
        data.name = `${student.firstName} ${student.lastName}`;
      } else {
        data.name = "Unknown Student";
      }
    } else {
      // Admin creation
      data.title = "Guidance Related Events";
      if (!data.sched_date) {
        return res.status(400).json({ error: "Admin-created event must have sched_date" });
      }
      if (!data.name) {
        return res.status(400).json({ error: "Admin-created event must include a name" });
      }
      data.status = "Scheduled";
    }
    
    const createdRecord = await backlogService.createBacklog(data);
    return res.status(201).json(createdRecord);
  } catch (error) {
    console.error("Error in createBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Update an existing backlog record.
 * Only an admin is allowed to update.
 * Expects req.body.action to be one of: "Cancel", "Edit", or "Mark Complete".
 * - "Edit": If a new sched_date is provided, updates the date and sets status to "Scheduled".
 * - "Cancel": Sets status to "Cancelled" and records completed_at.
 * - "Mark Complete": Sets status to "Completed" and records completed_at.
 */
async function updateBacklog(req, res) {
  try {
    const id = req.params.id;
    let updateData = req.body;

    if (updateData.action === "Edit" && updateData.sched_date) {
      updateData.status = "Scheduled";
    } else if (updateData.action === "Cancel") {
      updateData.completed_at = new Date();
      updateData.status = "Cancelled";
    } else if (updateData.action === "Mark Complete") {
      updateData.completed_at = new Date();
      updateData.status = "Completed";
    } else if (updateData.action === "Trash") {
      updateData.status = "Trash";
    } else if (updateData.action === "Restore") {
      updateData.status = "Cancelled"; // Restore back to "Cancelled" state
    } else if (updateData.action === "Permanent") {
      updateData.status = "Permanent"; // Instead of deleting, mark as "Permanent"
    }

    const updatedRecord = await backlogService.updateBacklog(id, updateData);
    return res.json(updatedRecord);
  } catch (error) {
    console.error("Error in updateBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
}




/**
 * Retrieve backlog records with optional filtering.
 * The front end can filter records by status (e.g., to show pending requests vs. scheduled events).
 */
async function getBacklogs(req, res) {
  try {
    const filter = req.query;
    const records = await backlogService.getBacklogs(filter);
    return res.json(records);
  } catch (error) {
    console.error("Error in getBacklogs:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createBacklog,
  updateBacklog,
  getBacklogs,
};
