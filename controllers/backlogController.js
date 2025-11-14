// controllers/backlogController.js
const backlogService = require("../services/backlogService");
const db = require("../db");
const { format } = require("date-fns");
const { Resend } = require('resend');
const fs = require("fs");
const path = require("path");

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

exports.createBacklog = async (req, res) => {
  console.log('[createBacklog] Request received');
  try {
    const data = req.body;
    console.log('[createBacklog] Data:', { student_id: data.student_id, name: data.name, sched_date: data.sched_date });

    if (data.student_id) {
      console.log('[createBacklog] Student request detected, student_id:', data.student_id);
      data.title = "Request Meeting";
      data.sched_date = null;
      data.status = "Pending";
      
      const [rows] = await db.query(
        "SELECT firstName, lastName, email FROM students WHERE id = ?",
        [data.student_id]
      );

      if (rows.length > 0) {
        const student = rows[0];
        data.name = `${student.firstName} ${student.lastName}`;
        console.log('[createBacklog] Student found:', data.name, student.email);

        // Send confirmation email using Resend
        try {
          await resend.emails.send({
            from: 'MindU <onboarding@resend.dev>',
            to: student.email,
            subject: 'Appointment Request Received – MIND-U',
            html: `
              <p>Dear ${data.name},</p>
              <p>Thank you for requesting an appointment through the MIND-U Student Wellness Management System.</p>
              <br>
              <p>Your appointment request will be reviewed by our team. Once it is approved and scheduled, you will receive a notification with the appointment details.</p>
              <br>
              <p><em>Note: This is an automated message — <strong>please do not reply</strong>.</em></p>
              <br>
              <p>Thank you for using MIND-U.</p>
              <p>Best regards,</p>
              <p><strong>The Mind-U Team</strong></p>
            `,
          });
          console.log('[createBacklog] Confirmation email sent to:', student.email);
        } catch (emailError) {
          console.error('[createBacklog] Failed to send confirmation email:', emailError);
          // Continue processing even if email fails
        }
      } else {
        data.name = "Unknown Student";
        console.log('[createBacklog] Student not found, using Unknown Student');
      }
    } else {
      console.log('[createBacklog] Admin-created event detected');
      if (!data.sched_date) {
        console.log('[createBacklog] Missing sched_date for admin event');
        return res.status(400).json({ error: "Admin-created event must have sched_date" });
      }

      if (!data.name) {
        console.log('[createBacklog] Missing name for admin event');
        return res.status(400).json({ error: "Admin-created event must include a name" });
      }

      data.status = "Scheduled";

      const formatDate = (dateStr) =>
        format(new Date(dateStr), "EEEE - MM/dd/yyyy");

      const message = `${data.staff_position}: ${data.staff_name} created a new guidance event named ${data.name} scheduled ${formatDate(data.sched_date)}`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
      console.log('[createBacklog] Activity log created for admin event');
    }

    const createdRecord = await backlogService.createBacklog(data);
    console.log('[createBacklog] Backlog created successfully, ID:', createdRecord.id);

    const io = req.io;
    if (io) {
      console.log('[createBacklog] Emitting socket update');
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    return res.status(201).json({ success: true, data: createdRecord });

  } catch (error) {
    console.error("[createBacklog] Error in createBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateBacklog = async (req, res) => {
  const id = req.params.id;
  console.log('[updateBacklog] Request received for ID:', id);
  
  try {
    let updateData = req.body;
    console.log('[updateBacklog] Update data:', { action: updateData.action, status: updateData.status, name: updateData.name });

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
      console.log('[updateBacklog] Edit action - rescheduling');
      updateData.status = "Scheduled";
      if (student_id && !from_cancel) {
        message = `${staff_position}: ${staff_name} rescheduled a scheduled request from ${name} from ${formatDate(original_date)} to ${formatDate(sched_date)}`;
      } else if (student_id && from_cancel) {
        message = `${staff_position}: ${staff_name} rescheduled a cancelled meeting request from ${name} to ${formatDate(sched_date)}`;
      }
    } else if (action === "Schedule" && sched_date && from_pending) {
      console.log('[updateBacklog] Schedule action - from pending');
      updateData.status = "Scheduled";
      message = `${staff_position}: ${staff_name} scheduled a pending meeting request from ${name} in ${formatDate(sched_date)}`;
    } else if (action === "Cancel") {
      console.log('[updateBacklog] Cancel action');
      updateData.completed_at = new Date();
      updateData.status = "Cancelled";
      message = `${staff_position}: ${staff_name} cancelled the meeting request from ${name} dated ${formatDate(original_date)}`;
    } else if (action === "Mark Complete") {
      console.log('[updateBacklog] Mark Complete action');
      updateData.completed_at = new Date();
      updateData.status = "Completed";
      message = `${staff_position}: ${staff_name} marked complete the meeting request from ${name} dated ${formatDate(original_date)}`;
    } else if (action === "Trash") {
      console.log('[updateBacklog] Trash action');
      updateData.status = "Trash";
      message = `${staff_position}: ${staff_name} trashed the cancelled meeting request from ${name}`;
    } else if (action === "Restore") {
      console.log('[updateBacklog] Restore action');
      updateData.status = "Cancelled";
      message = `${staff_position}: ${staff_name} restored the meeting request from ${name}`;
    } else if (action === "Delete") {
      console.log('[updateBacklog] Delete action - permanent deletion');
      const deleteQuery = "DELETE FROM backlogs WHERE id = ?";
      await db.query(deleteQuery, [id]);

      message = `${staff_position}: ${staff_name} permanently deleted the meeting request from ${name}`;
      if (!student_id) {
        message = `${staff_position}: ${staff_name} permanently deleted the guidance event named ${name}`;
      }

      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
      console.log('[updateBacklog] Backlog deleted and activity logged');
      return res.status(200).json({ success: true, message: "Backlog record deleted successfully." });
    }

    if (!student_id && message) {
      message = message.replace(/meeting request from .*?(?=( |$))/, `guidance event named ${name}`);
      console.log('[updateBacklog] Message adjusted for guidance event');
    }

    const updatedRecord = await backlogService.updateBacklog(id, updateData);
    console.log('[updateBacklog] Backlog updated successfully');
  
    if (message) {
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
      console.log('[updateBacklog] Activity log created');
    }

    const io = req.io;
    if (io) {
      console.log('[updateBacklog] Emitting socket update');
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    if (student_id && updateData.status === "Scheduled" && sched_date) {
      console.log('[updateBacklog] Sending scheduled email to student:', student_id);
      const [studentResult] = await db.query("SELECT * FROM students WHERE id = ?", [student_id]);
      const student = studentResult[0];
        
      if (student) {
        const formattedDate = format(new Date(sched_date), "MMMM dd, yyyy");
        const formattedTime = format(new Date(sched_date), "hh:mm a");
        console.log('[updateBacklog] Student found:', student.email, 'Scheduled for:', formattedDate, formattedTime);
      
        // Send scheduled appointment email using Resend
        try {
          await resend.emails.send({
            from: 'MindU <onboarding@resend.dev>',
            to: student.email,
            subject: 'Appointment Scheduled – MIND-U Confirmation',
            html: `
              <p>Dear ${student.firstName} ${student.lastName},</p>
              <p>We're pleased to inform you that your appointment through the <strong>MIND-U Student Wellness Management System</strong> has been <strong>successfully scheduled</strong>.</p>
              <p><strong>Appointment Details:</strong><br>
              Date: ${formattedDate}<br>
              Time: ${formattedTime}</p>
              <p>Please be reminded to arrive <strong>on time</strong> for your scheduled appointment. If you are unable to attend, kindly inform the Guidance Office in advance.</p>
              <p><em>Note: This is an automated message — <strong>please do not reply</strong>.</em></p>
              <p>Thank you for taking a step toward your well-being.</p>
              <p>Best regards,<br><strong>The MIND-U Team</strong></p>
            `,
          });
          console.log('[updateBacklog] Scheduled email sent successfully');
        } catch (emailError) {
          console.error('[updateBacklog] Failed to send scheduled email:', emailError);
          // Continue processing even if email fails
        }
      } else {
        console.log('[updateBacklog] Student not found for email notification');
      }
    }

    return res.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error("[updateBacklog] Error in updateBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getBacklogs = async (req, res) => {
  console.log('[getBacklogs] Request received');
  try {
    const filter = req.query;
    console.log('[getBacklogs] Filter:', filter);
    const records = await backlogService.getBacklogs(filter);
    console.log('[getBacklogs] Retrieved records:', records.length);
    return res.json(records);
  } catch (error) {
    console.error("[getBacklogs] Error in getBacklogs:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteBacklog = async (req, res) => {
  const id = req.params.id;
  console.log('[deleteBacklog] Request received for ID:', id);
  
  try {
    const [existingBacklog] = await db.query("SELECT * FROM backlogs WHERE id = ?", [id]);
    if (existingBacklog.length === 0) {
      console.log('[deleteBacklog] Backlog not found:', id);
      return res.status(404).json({ error: "Backlog not found" });
    }
    console.log('[deleteBacklog] Backlog found:', existingBacklog[0].name);

    await backlogService.deleteBacklog(id);
    console.log('[deleteBacklog] Backlog deleted successfully');
    
    const io = req.io;
    if (io) {
      console.log('[deleteBacklog] Emitting socket update');
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    return res.status(200).json({ message: "Backlog deleted successfully" });
  } catch (error) {
    console.error("[deleteBacklog] Error in deleteBacklog:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.createRequest = async (req, res) => {
  console.log('[createRequest] Request received');
  try {
    const { name, sched_date, staff_name, staff_position } = req.body;
    const file = req.file;
    console.log('[createRequest] Data:', { name, sched_date, staff_name, staff_position, hasFile: !!file });

    if (!name || !sched_date || !file) {
      console.log('[createRequest] Missing required fields or file');
      return res.status(400).json({ error: "Missing required fields or file" });
    }

    const relativePath = `/public/request/${file.filename}`;
    console.log('[createRequest] File uploaded:', relativePath);

    const [result] = await db.query(
      `INSERT INTO backlogs (title, name, sched_date, status, proposal)
       VALUES (?, ?, ?, ?, ?)`,
      ["Guidance Related Events", name, sched_date, "Pending", relativePath]
    );
    console.log('[createRequest] Request created, ID:', result.insertId);

    const message = `${staff_position}: ${staff_name} proposed a new guidance event named ${name} scheduled ${format(new Date(sched_date), "EEEE - MM/dd/yyyy")}`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    console.log('[createRequest] Activity log created');

    res.status(201).json({ success: true, data: { id: result.insertId, name, sched_date, proposal: relativePath } });
  } catch (err) {
    console.error("[createRequest] Error creating backlog:", err);
    res.status(500).json({ error: err.message });
  }
};

// NEW: Update proposal (for edit and repropose)
exports.updateProposal = async (req, res) => {
  const id = req.params.id;
  console.log('[updateProposal] Request received for ID:', id);
  
  try {
    const { name, sched_date, staff_name, staff_position, action, original_proposal, current_status } = req.body;
    const file = req.file;
    console.log('[updateProposal] Data:', { name, sched_date, action, current_status, hasFile: !!file });

    let newStatus;
    let message;
    let relativePath;

    if (action === "EditDateOnly") {
      console.log('[updateProposal] EditDateOnly action - updating date only');
      // Scheduled: only update date, keep status as Scheduled
      newStatus = "Scheduled";
      message = `${staff_position}: ${staff_name} rescheduled the guidance event named ${name} to ${format(new Date(sched_date), "EEEE - MM/dd/yyyy")}`;
      
      // Update database without changing proposal file
      await db.query(
        `UPDATE backlogs 
         SET sched_date = ?, modified_at = NOW()
         WHERE id = ?`,
        [sched_date, id]
      );
      console.log('[updateProposal] Date updated successfully');
    } else if (action === "Edit") {
      console.log('[updateProposal] Edit action - updating proposal');
      if (!file) {
        console.log('[updateProposal] Missing proposal file');
        return res.status(400).json({ error: "Missing proposal file" });
      }

      // Delete old proposal file if it exists
      if (original_proposal) {
        const oldFilePath = path.join(__dirname, "../public", original_proposal.replace('/public/', ''));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('[updateProposal] Old proposal file deleted:', oldFilePath);
        }
      }

      relativePath = `request/${file.filename}`;
      console.log('[updateProposal] New proposal file:', relativePath);

      // Determine new status based on current status
      if (current_status === "Pending") {
        newStatus = "Pending";
        message = `${staff_position}: ${staff_name} updated the pending guidance event proposal named ${name} scheduled ${format(new Date(sched_date), "EEEE - MM/dd/yyyy")}`;
      } else if (current_status === "Denied" || current_status === "Trash") {
        // Denied/Trashed: set to Pending for re-review
        newStatus = "Pending";
        message = `${staff_position}: ${staff_name} resubmitted the guidance event proposal named ${name} for ${format(new Date(sched_date), "EEEE - MM/dd/yyyy")}`;
      }

      // Update database with new proposal file
      await db.query(
        `UPDATE backlogs 
         SET sched_date = ?, proposal = ?, status = ?, modified_at = NOW()
         WHERE id = ?`,
        [sched_date, relativePath, newStatus, id]
      );
      console.log('[updateProposal] Proposal updated with new status:', newStatus);
    } else if (action === "Repropose") {
      console.log('[updateProposal] Repropose action');
      if (!file) {
        console.log('[updateProposal] Missing proposal file');
        return res.status(400).json({ error: "Missing proposal file" });
      }

      // Delete old proposal file if it exists
      if (original_proposal) {
        const oldFilePath = path.join(__dirname, "../public", original_proposal);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('[updateProposal] Old proposal file deleted:', oldFilePath);
        }
      }

      relativePath = `request/${file.filename}`;
      console.log('[updateProposal] New proposal file:', relativePath);

      // Reproposing (from Trash back to Pending)
      newStatus = "Pending";
      message = `${staff_position}: ${staff_name} reproposed the guidance event named ${name} for ${format(new Date(sched_date), "EEEE - MM/dd/yyyy")}`;

      // Update database
      await db.query(
        `UPDATE backlogs 
         SET sched_date = ?, proposal = ?, status = ?, modified_at = NOW()
         WHERE id = ?`,
        [sched_date, relativePath, newStatus, id]
      );
      console.log('[updateProposal] Proposal reproposed successfully');
    }

    // Log activity
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    console.log('[updateProposal] Activity log created');

    // Emit update
    const io = req.io;
    if (io) {
      console.log('[updateProposal] Emitting socket update');
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    res.json({ success: true, data: { id, name, sched_date, proposal: relativePath || original_proposal, status: newStatus } });
  } catch (err) {
    console.error("[updateProposal] Error updating proposal:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateProposalStatus = async (req, res) => {
  const id = req.params.id;
  console.log('[updateProposalStatus] Request received for ID:', id);
  
  try {
    const { status, comment } = req.body;
    console.log('[updateProposalStatus] New status:', status, 'Comment:', comment);

    if (!["Approved", "Denied"].includes(status)) {
      console.log('[updateProposalStatus] Invalid status provided');
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedStatus = status === "Approved" ? "Scheduled" : "Denied";
    console.log('[updateProposalStatus] Updating to:', updatedStatus);

    const updatedRecord = await backlogService.updateProposalStatus(id, updatedStatus, comment);

    const [backlogRow] = await db.query("SELECT * FROM backlogs WHERE id = ?", [id]);
    const backlog = backlogRow[0];
    const message = `Admin updated proposal for "${backlog.name}" to "${updatedStatus}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    console.log('[updateProposalStatus] Status updated and activity logged');

    const io = req.io;
    if (io) {
      console.log('[updateProposalStatus] Emitting socket update');
      const updatedBacklogs = await backlogService.getBacklogs({});
      io.emit("updateBacklogs", updatedBacklogs);
    }

    return res.json({ success: true, data: updatedRecord });

  } catch (error) {
    console.error("[updateProposalStatus] Error updating proposal status:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getRequestsByStaffId = async (req, res) => {
  const { staffId } = req.params;
  console.log('[getRequestsByStaffId] Request received for staff ID:', staffId);
  
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
    console.log('[getRequestsByStaffId] Retrieved scheduled backlogs:', rows.length);
    
    return res.json(rows);
  } catch (err) {
    console.error("[getRequestsByStaffId] Error fetching scheduled backlogs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getStaffRequestsByStaffId = async (req, res) => {
  const { staffId } = req.params;
  console.log('[getStaffRequestsByStaffId] Request received for staff ID:', staffId);

  try {
    const [rows] = await db.query(
      `
      SELECT 
        b.id,
        b.sched_date,
        b.status,
        b.comment,
        CONCAT(s.firstName, ' ', s.lastName) AS student_name
      FROM backlogs b
      JOIN students s ON b.student_id = s.id
      WHERE b.staff_id = ?
        AND (b.status = 'Pending' OR b.status = 'Scheduled')
      ORDER BY 
        CASE WHEN b.sched_date IS NULL THEN 1 ELSE 0 END,
        b.sched_date ASC,
        b.created_at DESC
      `,
      [staffId]
    );
    console.log('[getStaffRequestsByStaffId] Retrieved staff requests:', rows.length);

    res.json(rows);
  } catch (err) {
    console.error("[getStaffRequestsByStaffId] Error fetching requests:", err);
    res.status(500).json({ error: "Database error" });
  }
};