const announcementService = require("../services/announcementService");
const db = require('../db');

exports.getAnnouncements = async (req, res) => {
  console.log('[getAnnouncements] Request received');
  try {
    const announcements = await announcementService.getAllAnnouncements();
    console.log('[getAnnouncements] Successfully fetched announcements:', announcements.length);
    return res.status(200).json(announcements);
  } catch (error) {
    console.error("[getAnnouncements] Error fetching announcements:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getAnnouncementById = async (req, res) => {
  const { id } = req.params;
  console.log('[getAnnouncementById] Request received for ID:', id);
  try {
    const announcement = await announcementService.getAnnouncementById(id);
    if (!announcement) {
      console.log('[getAnnouncementById] Announcement not found for ID:', id);
      return res.status(404).json({ message: "Announcement not found" });
    }
    console.log('[getAnnouncementById] Successfully fetched announcement:', announcement.title);
    return res.status(200).json(announcement);
  } catch (error) {
    console.error("[getAnnouncementById] Error fetching announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  const { title, category, announcementContent, end_date, staff_name = "Unknown", staff_position = "Unknown" } = req.body;
  console.log('[createAnnouncement] Request received:', { title, category, staff_name, staff_position });

  if (!title || !category || !announcementContent || !end_date) {
    console.log('[createAnnouncement] Validation failed - missing required fields');
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const newAnnouncement = await announcementService.createAnnouncement({
      title,
      category,
      announcementContent,
      end_date,
    });
    console.log('[createAnnouncement] Announcement created successfully:', newAnnouncement.id);

    const io = req.io;
    if (io) {
      console.log('[createAnnouncement] Emitting socket update');
      io.emit("updateAnnouncements", newAnnouncement);
    }

    // Insert activity log
    const message = `${staff_position}: ${staff_name} created announcement titled "${title}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    console.log('[createAnnouncement] Activity log created');

    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error("[createAnnouncement] Error creating announcement:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { staff_name = "Unknown", staff_position = "Unknown" } = req.body;
  console.log('[updateAnnouncement] Request received for ID:', id, { staff_name, staff_position });

  try {
    // Fetch existing announcement title before update
    const [rows] = await db.query("SELECT title FROM announcements WHERE id = ?", [id]);
    if (rows.length === 0) {
      console.log('[updateAnnouncement] Announcement not found for ID:', id);
      return res.status(404).json({ message: "Announcement not found" });
    }
    const oldTitle = rows[0].title;
    console.log('[updateAnnouncement] Current announcement title:', oldTitle);

    const updated = await announcementService.updateAnnouncement(id, req.body);
    if (!updated) {
      console.log('[updateAnnouncement] Update failed for ID:', id);
      return res.status(404).json({ message: "Announcement not found" });
    }
    console.log('[updateAnnouncement] Announcement updated successfully');

    const io = req.io;
    if (io) {
      console.log('[updateAnnouncement] Emitting socket update');
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    // Log update activity
    const message = `${staff_position}: ${staff_name} updated announcement titled "${oldTitle}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    console.log('[updateAnnouncement] Activity log created');

    return res.status(200).json({ message: "Announcement updated successfully" });
  } catch (error) {
    console.error("[updateAnnouncement] Error updating announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { staff_name = "Unknown", staff_position = "Unknown" } = req.body;
  console.log('[deleteAnnouncement] Request received for ID:', id, { staff_name, staff_position });

  try {
    // Fetch announcement title before delete
    const [rows] = await db.query("SELECT title FROM announcements WHERE id = ?", [id]);
    if (rows.length === 0) {
      console.log('[deleteAnnouncement] Announcement not found for ID:', id);
      return res.status(404).json({ message: "Announcement not found" });
    }
    const title = rows[0].title;
    console.log('[deleteAnnouncement] Deleting announcement:', title);

    const deleted = await announcementService.deleteAnnouncement(id);
    if (!deleted) {
      console.log('[deleteAnnouncement] Delete failed for ID:', id);
      return res.status(404).json({ message: "Announcement not found" });
    }
    console.log('[deleteAnnouncement] Announcement deleted successfully');

    const io = req.io;
    if (io) {
      console.log('[deleteAnnouncement] Emitting socket update');
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    // Log delete activity
    const message = `${staff_position}: ${staff_name} deleted announcement titled "${title}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    console.log('[deleteAnnouncement] Activity log created');

    return res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("[deleteAnnouncement] Error deleting announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMultipleAnnouncements = async (req, res) => {
  const { ids, staff_name = "Unknown", staff_position = "Unknown" } = req.body;
  console.log('[deleteMultipleAnnouncements] Request received:', { ids, staff_name, staff_position });

  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log('[deleteMultipleAnnouncements] Invalid request - no IDs provided');
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    // Fetch titles before deleting
    const [rows] = await db.query(
      `SELECT id, title FROM announcements WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    console.log('[deleteMultipleAnnouncements] Found announcements to delete:', rows.length);

    const deletedCount = await announcementService.deleteMultipleAnnouncements(ids);
    if (deletedCount === 0) {
      console.log('[deleteMultipleAnnouncements] No matching announcements found');
      return res.status(404).json({ message: "No matching announcements found" });
    }
    console.log('[deleteMultipleAnnouncements] Deleted count:', deletedCount);

    const io = req.io;
    if (io) {
      console.log('[deleteMultipleAnnouncements] Emitting socket update');
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    // Summary log for multiple deletes
    if (ids.length > 1) {
      const summaryMessage = `${staff_position}: ${staff_name} deleted ${ids.length} announcements`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [summaryMessage]);
      console.log('[deleteMultipleAnnouncements] Summary activity log created');
    }

    // Individual logs per deleted announcement
    for (const row of rows) {
      const message = `${staff_position}: ${staff_name} deleted announcement titled "${row.title}"`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }
    console.log('[deleteMultipleAnnouncements] Individual activity logs created:', rows.length);

    res.status(200).json({ message: "Announcements deleted successfully", count: deletedCount });
  } catch (error) {
    console.error("[deleteMultipleAnnouncements] Error deleting announcements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};