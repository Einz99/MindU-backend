const express = require("express");
const router = express.Router();
const pool = require("../db"); // Ensure db connection file
const { format, subHours } = require("date-fns");

// Get all activity logs
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM ActivityLog ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    console.error("❌ Error fetching activity logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Insert an activity log
router.post("/insert", async (req, res) => {
  try {
    console.log("🔹 Received Request:", req.body);

    const { action, initial, updated } = req.body;
    if (!action || !initial) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("🔹 Action:", action);
    console.log("🔹 Initial:", initial);
    if (updated) console.log("🔹 Updated:", updated);

    const reasons = {
      Add: "Added",
      Cancel: "Cancelled",
      Edit: "Rescheduled",
      "Mark Complete": "Completed",
      Schedule: "Scheduled",
      Trash: "Trashed",
      Permanent: "Permanently Deleted",
      Restore: "Restore",
    };
    const reason = reasons[action] || "Unknown Action";

    const eventType = initial.title === "Guidance Related Events" ? "Event" : "Meeting";

    const { format } = require("date-fns");
    const currentTime = format(new Date(), "hh:mm a");

    let originalDate = "No scheduled date";
    if (initial.sched_date) {
      originalDate = format(new Date(initial.sched_date), "MMMM d, yyyy 'at' hh:mm a");
    }

    let updatedDateMessage = "";
    if (updated && updated.sched_date) {
      const newDate = format(subHours(new Date(updated.sched_date), 8), "MMMM d, yyyy 'at' hh:mm a");
      updatedDateMessage = ` (Updated to: ${newDate})`;
    }

    const message = `${currentTime} - ${reason} ${eventType} for ${initial.name}, dated ${originalDate}${updatedDateMessage}`;

    const [result] = await pool.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    if (result.affectedRows > 0) {
      console.log("✅ Insert Successful!");
      return res.json({ success: true, message: "Activity log inserted successfully" });
    } else {
      console.log("❌ Insert Failed");
      return res.status(500).json({ error: "Failed to insert log" });
    }
  } catch (error) {
    console.error("❌ Error inserting activity log:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
