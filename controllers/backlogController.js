// controllers/backlogController.js
const backlogService = require("../services/backlogService");
const db = require("../db");
const { format, addDays } = require("date-fns");
const nodemailer = require('nodemailer');

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
exports.createBacklog = async (req, res) => {
  try {
    const data = req.body;

    if (data.student_id) {
      // Student creation
      data.title = "Request Meeting";
      data.sched_date = null;
      data.status = "Pending";

      // Lookup student's firstName and lastName from the students table.
      const [rows] = await db.query(
        "SELECT firstName, lastName, email FROM students WHERE id = ?",
        [data.student_id]
      );


      if (rows.length > 0) {
        const student = rows[0];
        data.name = `${student.firstName} ${student.lastName}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });
      
        await transporter.sendMail({
          from: `"The MIND-U Team" <${process.env.EMAIL_USER}>`,
          to: student.email,
          subject: 'Appointment Request Received – MIND-U',
          html: `<p>Dear ${data.name},</p>
                 <p>Thank you for requesting an appointment through the MIND-U Student Wellness Management System.</p><br>
                 <p>Your appointment request will be reviewed by our team. Once it is approved and scheduled, you will receive a notification with the appointment details.</p><br>
                 <p>Note: This is an automated message —— <strong>please do not reply<strong>.</p><br>
                 <p>Thank you for using MIND-U.<p>
                 <p>Best regards,</p>
                 <p><strong>The Mind-U Team<strong></p>
                 `,
        });
      } else {
        data.name = "Unknown Student";
      }

      
    } else {
      // Admin creation
      if (!data.sched_date) {
        return res.status(400).json({ error: "Admin-created event must have sched_date" });
      }

      if (!data.name) {
        return res.status(400).json({ error: "Admin-created event must include a name" });
      }

      data.status = "Scheduled";

      // 📝 Insert Activity Log
      const formatDate = (dateStr) =>
        format(new Date(dateStr), "EEEE - MM/dd/yyyy");

      const message = `${data.staff_position}: ${data.staff_name} created a new guidance event named ${data.name} scheduled ${formatDate(data.sched_date)}`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }

    const createdRecord = await backlogService.createBacklog(data);

    // Emit update
    const io = req.io;
    if (io) {
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    return res.status(201).json({ success: true, data: createdRecord });

  } catch (error) {
    console.error("Error in createBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Update an existing backlog record.
 * Only an admin is allowed to update.
 * Expects req.body.action to be one of: "Cancel", "Edit", or "Mark Complete".
 * - "Edit": If a new sched_date is provided, updates the date and sets status to "Scheduled".
 * - "Cancel": Sets status to "Cancelled" and records completed_at.
 * - "Mark Complete": Sets status to "Completed" and records completed_at.
 */
exports.updateBacklog = async (req, res) => {
  try {
    const id = req.params.id;
    let updateData = req.body;

    let message = "";
    const formatDate = (dateStr) =>
      format(new Date(dateStr), "EEEE - MM/dd/yyyy");

    const {
      action,
      staff_name,
      staff_position,
      student_id,
      name,
      from_pending,
      from_cancel,
      original_date,
      sched_date,
    } = updateData;

    if (action === "Edit" && sched_date) {
      updateData.status = "Scheduled";
      if (student_id && !from_cancel) {
        message = `${staff_position}: ${staff_name} rescheduled a scheduled request from ${name} from ${formatDate(original_date)} to ${formatDate(sched_date)}`;
      } else if (student_id && from_cancel) {
        message = `${staff_position}: ${staff_name} rescheduled a cancelled meeting request from ${name} to ${formatDate(sched_date)}`;
      }
    } else if (action === "Schedule" && sched_date && from_pending) {
      updateData.status = "Scheduled";
      message = `${staff_position}: ${staff_name} scheduled a pending meeting request from ${name} in ${formatDate(sched_date)}`;
    } else if (action === "Cancel") {
      updateData.completed_at = new Date();
      updateData.status = "Cancelled";
      message = `${staff_position}: ${staff_name} cancelled the meeting request from ${name} dated ${formatDate(original_date)}`;
    } else if (action === "Mark Complete") {
      updateData.completed_at = new Date();
      updateData.status = "Completed";
      message = `${staff_position}: ${staff_name} marked complete the meeting request from ${name} dated ${formatDate(original_date)}`;
    } else if (action === "Trash") {
      updateData.status = "Trash";
      message = `${staff_position}: ${staff_name} trashed the cancelled meeting request from ${name}`;
    } else if (action === "Restore") {
      updateData.status = "Cancelled";
      message = `${staff_position}: ${staff_name} restored the meeting request from ${name}`;
    } else if (action === "Delete") {
      const deleteQuery = "DELETE FROM backlogs WHERE id = ?";
      await db.query(deleteQuery, [id]);

      message = `${staff_position}: ${staff_name} permanently deleted the meeting request from ${name}`;
      if (!student_id) {
        message = `${staff_position}: ${staff_name} permanently deleted the guidance event named ${name}`;
      }

      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
      return res.status(200).json({ success: true, message: "Backlog record deleted successfully." });
    }

    // Replace message if not related to student
    if (!student_id && message) {
      message = message.replace(/meeting request from .*?(?=( |$))/, `guidance event named ${name}`);
    }

    const updatedRecord = await backlogService.updateBacklog(id, updateData);
  
    if (message) {
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }

    // Emit update
    const io = req.io;
    if (io) {
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    if (student_id && updateData.status === "Scheduled" && sched_date) {
      const [studentResult] = await db.query("SELECT * FROM students WHERE id = ?", [student_id]);
      const student = studentResult[0];
        
      if (student) {
        const formattedDate = format(new Date(sched_date), "MMMM dd, yyyy");
        const formattedTime = format(new Date(sched_date), "hh:mm a");
      
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
      
        await transporter.sendMail({
          from: `"The MIND-U Team" <${process.env.EMAIL_USER}>`,
          to: student.email,
          subject: 'Appointment Scheduled – MIND-U Confirmation',
          html: `
            <p>Dear ${student.firstName} ${student.lastName},</p>
            <p>We’re pleased to inform you that your appointment through the <strong>MIND-U Student Wellness Management System</strong> has been <strong>successfully scheduled</strong>.</p>
            <p><strong>Appointment Details:</strong><br>
            Date: ${formattedDate}<br>
            Time: ${formattedTime}</p>
            <p>Please be reminded to arrive <strong>on time</strong> for your scheduled appointment. If you are unable to attend, kindly inform the Guidance Office in advance.</p>
            <p><strong>This is an automated message — do not reply to this email.</strong></p>
            <p>Thank you for taking a step toward your well-being.</p>
            <p>Best regards,<br><strong>The MIND-U Team</strong></p>
          `,
        });
      }
    }

    return res.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error("Error in updateBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Retrieve backlog records with optional filtering.
 * The front end can filter records by status (e.g., to show pending requests vs. scheduled events).
 */
exports.getBacklogs = async (req, res) => {
  try {
    const filter = req.query;
    const records = await backlogService.getBacklogs(filter);
    return res.json(records);
  } catch (error) {
    console.error("Error in getBacklogs:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Delete a backlog record by its ID.
 * Only an admin is allowed to delete.
 */
exports.deleteBacklog = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the backlog exists
    const [existingBacklog] = await db.query("SELECT * FROM backlogs WHERE id = ?", [id]);
    if (existingBacklog.length === 0) {
      return res.status(404).json({ error: "Backlog not found" });
    }

    // Perform the delete operation
    await backlogService.deleteBacklog(id);
    const io = req.io;
    if (io) {
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    return res.status(200).json({ message: "Backlog deleted successfully" });
  } catch (error) {
    console.error("Error in deleteBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
}

exports.createRequest = async (req, res) => {
  try {
    const { name, sched_date, staff_name, staff_position } = req.body;
    const file = req.file;

    if (!name || !sched_date || !file) {
      return res.status(400).json({ error: "Missing required fields or file" });
    }

    const relativePath = `request/${file.filename}`;

    const [result] = await db.query(
      `INSERT INTO backlogs (title, name, sched_date, status, proposal)
       VALUES (?, ?, ?, ?, ?)`,
      ["Guidance Related Events", name, sched_date, "Pending", relativePath]
    );

    const message = `${staff_position}: ${staff_name} proposed a new guidance event named ${name} scheduled ${format(new Date(sched_date), "EEEE - MM/dd/yyyy")}`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    res.status(201).json({ success: true, data: { id: result.insertId, name, sched_date, proposal: relativePath } });
  } catch (err) {
    console.error("Error creating backlog:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateProposalStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, comment } = req.body; // status: "Approved" or "Denied"

    if (!["Approved", "Denied"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedStatus = status === "Approved" ? "Scheduled" : "Denied";

    // Use new service
    const updatedRecord = await backlogService.updateProposalStatus(id, updatedStatus, comment);

    // Log activity
    const [backlogRow] = await db.query("SELECT * FROM backlogs WHERE id = ?", [id]);
    const backlog = backlogRow[0];
    const message = `Admin updated proposal for "${backlog.name}" to "${updatedStatus}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    // Emit updated backlogs
    const io = req.io;
    if (io) {
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    return res.json({ success: true, data: updatedRecord });

  } catch (error) {
    console.error("Error updating proposal status:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getRequestsByStaffId = async (req, res) => {
  const { staffId } = req.params;
  try {
    const [rows] = await db.query(
      `
      SELECT 
        b.id AS backlog_id,
        s.id AS student_id,
        CONCAT(s.firstName, ' ', s.lastName) AS student_name,
        b.sched_date,
        b.status
      FROM backlogs b
      JOIN students s ON b.student_id = s.id
      JOIN staffs st ON s.adviser = st.name
      WHERE st.id = ?
        AND b.status = 'Scheduled'
      ORDER BY b.sched_date ASC
      `,
      [staffId]
    );
    
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching scheduled backlogs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getStaffRequestsByStaffId = async (req, res) => {
  const { staffId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT 
        b.id,
        b.sched_date,
        b.status,
        b.comment,
        b.name
      FROM backlogs b
      WHERE b.staff_id = ?
        AND (b.status = 'Pending' OR b.status = 'Scheduled')
      ORDER BY 
        CASE WHEN b.sched_date IS NULL THEN 1 ELSE 0 END, -- pending first
        b.sched_date ASC,
        b.created_at DESC
      `,
      [staffId]
    );

    res.json(rows); // staff’s own meeting requests only
  } catch (err) {
    console.error("Error fetching requests:", err);
    res.status(500).json({ error: "Database error" });
  }
};