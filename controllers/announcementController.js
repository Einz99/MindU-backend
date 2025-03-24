const announcementService = require("../services/announcementService");

const broadcastAnnouncements = async (io, announcementService) => {
  if (!io) {
    console.log("⚠️ WebSocket (io) not available.");
    return;
  }

  try {
    const announcements = await announcementService.getAllAnnouncements();
    console.log("📡 Broadcasting Full Announcements List:", announcements);
    io.emit("updateAnnouncements", announcements); // Emit the latest state of announcements
  } catch (error) {
    console.error("❌ Error broadcasting announcements:", error);
  }
};

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
  const { title, category, announcementContent } = req.body;

  if (!title || !category || !announcementContent) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const newAnnouncement = await announcementService.createAnnouncement({
      title,
      category,
      announcementContent,
    });

    const io = req.io; // ✅ Use req.io instead of req.app.get("io")
    if (io) {
      console.log("📢 Broadcasting New Announcement:", newAnnouncement);
      io.emit("updateAnnouncements", newAnnouncement);
    }

    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await announcementService.updateAnnouncement(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const io = req.io; // ✅ Use req.io
    if (io) {
      console.log("🔄 Broadcasting Updated Announcement");
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    return res.status(200).json({ message: "Announcement updated successfully" });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await announcementService.deleteAnnouncement(id);

    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const io = req.io; // ✅ Use req.io
    if (io) {
      console.log("🗑️ Broadcasting Deleted Announcement");
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    return res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMultipleAnnouncements = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    const deletedCount = await announcementService.deleteMultipleAnnouncements(ids);

    if (deletedCount === 0) {
      return res.status(404).json({ message: "No matching announcements found" });
    }

    const io = req.io; // ✅ Use req.io
    if (io) {
      console.log("🗑️ Broadcasting Multiple Deleted Announcements");
      io.emit("updateAnnouncements", await announcementService.getAllAnnouncements());
    }

    res.status(200).json({ message: "Announcements deleted successfully", count: deletedCount });
  } catch (error) {
    console.error("Error deleting announcements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
