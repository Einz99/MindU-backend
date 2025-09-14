const resourcesService = require("../services/resourcesService");
const fs = require("fs");
const path = require("path");
const db = require("../db");

// ✅ Function to broadcast the latest resources list
const broadcastResources = async (io) => {
  if (!io) {
    console.log("⚠️ WebSocket (io) not available.");
    return;
  }

  try {
    const resources = await resourcesService.getAllResources();
    console.log("📡 Broadcasting Full Resources List:", resources);
    io.emit("updateResources", resources); // Emit the latest state of resources
  } catch (error) {
    console.error("❌ Error broadcasting resources:", error);
  }
};

exports.getResources = async (req, res) => {
  try {
    const resources = await resourcesService.getAllResources();
    return res.status(200).json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getWellness = async (req, res) => {
  try {
    const resources = await resourcesService.getAllWellness();
    return res.status(200).json(resources);
  } catch (error) {
    console.error("Error fetching wellness resources:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await resourcesService.getResourceById(id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    return res.status(200).json(resource);
  } catch (error) {
    console.error("Error fetching resource:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const io = req.io;
    let filepath = "";
    let bannerPath = "";

    if (req.files) {
      if (req.files["file"] && req.files["file"][0]) {
        filepath = "/resources/" + req.files["file"][0].filename;

        if (!req.body.resourceType) {
          const mimetype = req.files["file"][0].mimetype;
          if (mimetype.startsWith("image/")) {
            req.body.resourceType = "image";
          } else if (mimetype.startsWith("video/")) {
            req.body.resourceType = "video";
          } else {
            req.body.resourceType = "document";
          }
        }
      }

      if (req.files["banner"] && req.files["banner"][0]) {
        bannerPath = "/resources/" + req.files["banner"][0].filename;
      }
    }

    if (req.body.article) {
      req.body.description = req.body.article + "\n" + (req.body.description || "");
    }

    const status = req.body.status;
    const posted_at = status === "Posted" ? new Date() : null;
    const isResource = req.body.isResource === "0" ? 0 : 1;

    const resourceData = {
      ...req.body,
      isResource,
      filepath,
      banner: bannerPath,
      status,
      posted_at,
    };

    const newResource = await resourcesService.createResource(resourceData);

    // 📝 Insert Activity Log
    let message = "";
    const type = req.body.resourceType;
    const title = String(req.body.title || "").trim();
    const staff_position = String(req.body.staff_position || "").trim();
    const staff_name = String(req.body.staff_name || "").trim();
    if (isResource) {
      if (type === "Document") {
        message = `${staff_position}: ${staff_name} created a new resource document named ${title}`;
      } else if (type === "Video") {
        message = `${staff_position}: ${staff_name} created a new resource video named ${title}`;
      }
    } else {
      message = `${staff_position}: ${staff_name} created a new wellness named ${title}`;
    }
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    await broadcastResources(io);

    return res.status(201).json({
      message: "Resource created successfully",
      resource: newResource,
    });
  } catch (error) {
    console.error("Error creating resource:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const io = req.io;
    const { id } = req.params;
    let filepath = req.body.filepath || "";
    let bannerPath = req.body.banner || "";

    const currentResource = await resourcesService.getResourceById(id);

    if (req.files) {
      if (req.files["file"] && req.files["file"][0]) {
        const oldFilePath = currentResource.filepath;
        filepath = "/resources/" + req.files["file"][0].filename;

        if (oldFilePath) {
          const oldFilePathFull = path.join(__dirname, "../resources", oldFilePath);
          if (fs.existsSync(oldFilePathFull)) {
            fs.unlink(oldFilePathFull, (err) => {
              if (err) console.error("Failed to delete old file:", err);
            });
          }
        }
      }

      if (req.files["banner"] && req.files["banner"][0]) {
        const oldBannerPath = currentResource.banner;
        bannerPath = "/resources/" + req.files["banner"][0].filename;

        if (oldBannerPath) {
          fs.unlink(path.join(__dirname, "../resources", oldBannerPath), (err) => {
            if (err) console.error("Failed to delete old banner:", err);
          });
        }
      }
    }

    if (req.body.article) {
      req.body.description = req.body.article + "\n" + (req.body.description || "");
    }

    const status = req.body.status;
    const posted_at = status === "Posted" ? (req.body.posted_at || new Date()) : null;
    const isResource = req.body.isResource === "0" ? 0 : 1;

    const resourceData = {
      ...req.body,
      isResource,
      filepath,
      banner: bannerPath,
      status,
      posted_at,
    };

    const updated = await resourcesService.updateResource(id, resourceData);
    if (!updated) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // 📝 Insert Activity Log
    let message = "";
    const type = req.body.resourceType;
    const { title, staff_position, staff_name } = req.body;

    if (isResource) {
      if (type === "Document") {
        message = `${staff_position}: ${staff_name} changed a resource document named ${title}`;
      } else if (type === "Video") {
        message = `${staff_position}: ${staff_name} changed a resource video named ${title}`;
      }
    } else {
      message = `${staff_position}: ${staff_name} changed a wellness named ${title}`;
    }

    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    await broadcastResources(io);

    return res.status(200).json({ message: "Resource updated successfully" });
  } catch (error) {
    console.error("Error updating resource:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteResources = async (req, res) => {
  try {
    const io = req.io;
    const { ids, staff_name = "Unknown", staff_position = "Unknown" } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    // Step 1: Fetch titles and isResource before deleting
    const [rows] = await db.query(
      `SELECT ID, title, isResource FROM resources WHERE ID IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // Step 2: Insert summary log for multiple deletions (only if more than 1)
    if (ids.length > 1) {
      const isResourceType = rows.length > 0 ? rows[0].isResource === 1 : true; // default to resource if empty
      const typeLabel = isResourceType ? "resources" : "wellness";
        
      const summaryMessage = `${staff_position}: ${staff_name} deleted ${ids.length} ${typeLabel}`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [summaryMessage]);
    }

    // Step 3: Log each deletion individually without ID, change resource/wellness based on isResource boolean
    for (const row of rows) {
      const type = row.isResource ? "resource" : "wellness";
      const message = `${staff_position}: ${staff_name} deleted the ${type} titled "${row.title}"`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }

    // Step 4: Delete the resources
    const deletedCount = await resourcesService.deleteResources(ids);

    if (deletedCount === 0) {
      return res.status(404).json({ message: "No matching resources found" });
    }

    // Step 5: Broadcast updated resources list
    await broadcastResources(io);

    return res.status(200).json({ message: "Resources deleted successfully", count: deletedCount });
  } catch (error) {
    console.error("Error deleting resources:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const io = req.io;
    const { id } = req.params;
    const { staff_name = "Unknown", staff_position = "Unknown" } = req.body; // Expect from frontend

    // Step 1: Get the resource to log title and isResource before deletion
    const [rows] = await db.query("SELECT title, isResource FROM resources WHERE ID = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }
    const { title, isResource } = rows[0];
    const type = isResource ? "resource" : "wellness";

    // Step 2: Delete the resource
    const deletedCount = await resourcesService.deleteResources([id]);

    if (deletedCount === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // Step 3: Log the deletion without ID in message
    const message = `${staff_position}: ${staff_name} deleted the ${type} titled "${title}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

    // Step 4: Broadcast updated resource list
    await broadcastResources(io);

    return res.status(200).json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getTopResourcesAndWellness = async (req, res) => {
  try {
    // Get top 5 resources (isResource = 1)
    const [topResources] = await db.query(
      `
      SELECT ID, title, category, views, banner, filepath, resourceType
      FROM (
          SELECT 
              ID, title, category, views, banner, filepath, resourceType,
              ROW_NUMBER() OVER (PARTITION BY category ORDER BY views DESC) AS rn
          FROM resources
          WHERE isResource = 1
      ) t
      WHERE rn = 1
      ORDER BY category;
      `
    );

    // Get top 1 wellness per category (isResource = 0)
    const [topWellness] = await db.query(
      `
      SELECT ID, title, category, views, banner, filepath, resourceType
      FROM resources
      WHERE isResource = 0
      ORDER BY views DESC
      LIMIT 5
      `
    );

    return res.status(200).json({
      topResources,
      topWellness,
    });
  } catch (error) {
    console.error("Error fetching top resources/wellness:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.incrementView = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Update views
    const [result] = await db.query(
      `UPDATE resources SET views = COALESCE(views, 0) + 1 WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // 2️⃣ Optional: return new view count
    const [rows] = await db.query(`SELECT views FROM resources WHERE id = ?`, [id]);

    return res.status(200).json({ message: "View count incremented", views: rows[0].views });
  } catch (err) {
    console.error("Error incrementing view:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
