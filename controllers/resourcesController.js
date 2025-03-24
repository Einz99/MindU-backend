const resourcesService = require("../services/resourcesService");

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
        // If resourceType is not provided, auto-detect based on the file's mimetype
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

    // Append content from the "article" field to the description if it exists.
    // This ensures that the article content is added to all resources using the backend.
    if (req.body.article) {
      req.body.description = req.body.article + "\n" + (req.body.description || "");
    }

    const isResource = req.body.isResource === "0" ? 0 : 1;
    const resourceData = {
      ...req.body,
      isResource,
      filepath,
      banner: bannerPath
    };

    const newResource = await resourcesService.createResource(resourceData);
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

    if (req.files) {
      if (req.files["file"] && req.files["file"][0]) {
        filepath = "/resources/" + req.files["file"][0].filename;
        // If resourceType is not provided, auto-detect based on file mimetype
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

    // Append article content to description if provided
    if (req.body.article) {
      req.body.description = req.body.article + "\n" + (req.body.description || "");
    }

    const isResource = req.body.isResource === "0" ? 0 : 1;
    const resourceData = {
      ...req.body,
      isResource,
      filepath,
      banner: bannerPath
    };

    const updated = await resourcesService.updateResource(id, resourceData);
    if (!updated) {
      return res.status(404).json({ message: "Resource not found" });
    }
    await broadcastResources(io);
    return res.status(200).json({ message: "Resource updated successfully" });
  } catch (error) {
    console.error("Error updating resource:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteResources = async (req, res) => {
  try {
    const io = req.io; // WebSocket instance
    const { ids } = req.body; // Expecting an array of resource IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    const deletedCount = await resourcesService.deleteResources(ids);

    if (deletedCount === 0) {
      return res.status(404).json({ message: "No matching resources found" });
    }

    // ✅ Broadcast updated resources list
    await broadcastResources(io);

    return res.status(200).json({ message: "Resources deleted successfully", count: deletedCount });
  } catch (error) {
    console.error("Error deleting resources:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
