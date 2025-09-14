const studentActivityService = require("../services/studentActivityService");
const db = require("../db");

exports.getActivitiesByDate = async (req, res) => {
  try {
    const { date } = req.query; // frontend sends ?date=2025-09-08

    if (!date) {
      return res.status(400).json({ error: "Missing required parameter: date" });
    }

    const activities = await studentActivityService.getActivitiesByDate(date);

    res.json({ date, activities });
  } catch (err) {
    console.error("Error in getActivitiesByDate:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.insertActivity = async (req, res) => {
  try {
    const { module } = req.body;

    if (!module) {
      return res.status(400).json({ message: "Module is required" });
    }

    const allowedModules = ['Resource', 'Wellness', 'Chatbot', 'Mood', 'Scheduler', 'Pet'];
    if (!allowedModules.includes(module)) {
      return res.status(400).json({ message: "Invalid module" });
    }

    await db.query(
      `INSERT INTO studentActivityLog (module) VALUES (?)`,
      [module]
    );

    return res.status(201).json({ message: "Activity logged successfully" });
  } catch (err) {
    console.error("Error inserting activity:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};