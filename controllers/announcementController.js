const announcementService = require("../services/announcementService");
const db = require('../db');

exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await announcementService.getAllAnnouncements();
    return res.status(200).json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await announcementService.getAnnouncementById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    return res.status(200).json(announcement);
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  const { title, category, announcementContent, end_date, staff_name = "Unknown", staff_position = "Unknown" } = req.body;

  if (!title || !category || !announcementContent || !end_date) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const newAnnouncement = await announcementService.createAnnouncement({
      title,
      category,
      announcementContent,
      end_date,
    });

    const io = req.io;
    if (io) {
      io.emit("updateAnnouncements", newAnnouncement);
    }

    // Insert activity log
    const message = `${staff_position}: ${staff_name} created announcement titled "${title}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_name = "Unknown", staff_position = "Unknown" } = req.body;

    // Fetch existing announcement title before update
    const [rows] = await db.query("SELECT title FROM announcements WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    const oldTitle = rows[0].title;

    const updated = await announcementService.updateAnnouncement(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const io = req.io;
    if (io) {
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    // Log update activity
    const message = `${staff_position}: ${staff_name} updated announcement titled "${oldTitle}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    return res.status(200).json({ message: "Announcement updated successfully" });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_name = "Unknown", staff_position = "Unknown" } = req.body;

    // Fetch announcement title before delete
    const [rows] = await db.query("SELECT title FROM announcements WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    const title = rows[0].title;

    const deleted = await announcementService.deleteAnnouncement(id);
    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const io = req.io;
    if (io) {
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    // Log delete activity
    const message = `${staff_position}: ${staff_name} deleted announcement titled "${title}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    return res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMultipleAnnouncements = async (req, res) => {
  try {
    const { ids, staff_name = "Unknown", staff_position = "Unknown" } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    // Fetch titles before deleting
    const [rows] = await db.query(
      `SELECT id, title FROM announcements WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    const deletedCount = await announcementService.deleteMultipleAnnouncements(ids);
    if (deletedCount === 0) {
      return res.status(404).json({ message: "No matching announcements found" });
    }

    const io = req.io;
    if (io) {
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    // Summary log for multiple deletes
    if (ids.length > 1) {
      const summaryMessage = `${staff_position}: ${staff_name} deleted ${ids.length} announcements`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [summaryMessage]);
    }

    // Individual logs per deleted announcement
    for (const row of rows) {
      const message = `${staff_position}: ${staff_name} deleted announcement titled "${row.title}"`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }

    res.status(200).json({ message: "Announcements deleted successfully", count: deletedCount });
  } catch (error) {
    console.error("Error deleting announcements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};