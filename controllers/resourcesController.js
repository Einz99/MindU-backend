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
    io.emit("updateResources", resources);
    
    console.log('[broadcastResources] Resources broadcasted', {
      timestamp: new Date().toISOString(),
      resourceCount: resources.length
    });
  } catch (error) {
    console.error('[broadcastResources] Failed to broadcast', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  }
};

exports.getResources = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[getResources] Request started', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    const resources = await resourcesService.getAllResources();
    
    console.log('[getResources] Request successful', {
      timestamp: new Date().toISOString(),
      resourceCount: resources.length,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(resources);
  } catch (error) {
    console.error('[getResources] Request failed', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getWellness = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[getWellness] Request started', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    const resources = await resourcesService.getAllWellness();
    
    console.log('[getWellness] Request successful', {
      timestamp: new Date().toISOString(),
      wellnessCount: resources.length,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(resources);
  } catch (error) {
    console.error('[getWellness] Request failed', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getResourceById = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    
    console.log('[getResourceById] Request started', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      ip: req.ip
    });

    const resource = await resourcesService.getResourceById(id);
    
    if (!resource) {
      console.warn('[getResourceById] Resource not found', {
        timestamp: new Date().toISOString(),
        resource_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Resource not found" });
    }
    
    console.log('[getResourceById] Request successful', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      title: resource.title,
      type: resource.resourceType,
      isResource: resource.isResource,
      views: resource.views,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(resource);
  } catch (error) {
    console.error('[getResourceById] Request failed', {
      timestamp: new Date().toISOString(),
      resource_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createResource = async (req, res) => {
  const startTime = Date.now();
  try {
    const io = req.io;
    let filepath = "";
    let bannerPath = "";

    console.log('[createResource] Request started', {
      timestamp: new Date().toISOString(),
      title: req.body.title,
      category: req.body.category,
      isResource: req.body.isResource,
      status: req.body.status,
      staff_name: req.body.staff_name,
      staff_position: req.body.staff_position,
      hasFiles: !!req.files,
      ip: req.ip
    });

    if (req.files) {
      if (req.files["file"] && req.files["file"][0]) {
        filepath = "/resources/" + req.files["file"][0].filename;

        console.log('[createResource] File uploaded', {
          timestamp: new Date().toISOString(),
          filename: req.files["file"][0].filename,
          mimetype: req.files["file"][0].mimetype,
          size: req.files["file"][0].size
        });

        if (!req.body.resourceType) {
          const mimetype = req.files["file"][0].mimetype;
          if (mimetype.startsWith("image/")) {
            req.body.resourceType = "image";
          } else if (mimetype.startsWith("video/")) {
            req.body.resourceType = "video";
          } else {
            req.body.resourceType = "document";
          }
          
          console.log('[createResource] Resource type auto-detected', {
            timestamp: new Date().toISOString(),
            detectedType: req.body.resourceType,
            mimetype
          });
        }
      }

      if (req.files["banner"] && req.files["banner"][0]) {
        bannerPath = "/resources/" + req.files["banner"][0].filename;
        
        console.log('[createResource] Banner uploaded', {
          timestamp: new Date().toISOString(),
          filename: req.files["banner"][0].filename,
          size: req.files["banner"][0].size
        });
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
    
    console.log('[createResource] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: message
    });

    await broadcastResources(io);

    console.log('[createResource] Request successful', {
      timestamp: new Date().toISOString(),
      resource_id: newResource.ID,
      title,
      type,
      isResource,
      status,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(201).json({
      message: "Resource created successfully",
      resource: newResource,
    });
  } catch (error) {
    console.error('[createResource] Request failed', {
      timestamp: new Date().toISOString(),
      title: req.body.title,
      category: req.body.category,
      staff_name: req.body.staff_name,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateResource = async (req, res) => {
  const startTime = Date.now();
  try {
    const io = req.io;
    const { id } = req.params;
    let filepath = req.body.filepath || "";
    let bannerPath = req.body.banner || "";

    console.log('[updateResource] Request started', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      title: req.body.title,
      status: req.body.status,
      staff_name: req.body.staff_name,
      hasFiles: !!req.files,
      ip: req.ip
    });

    const currentResource = await resourcesService.getResourceById(id);

    if (req.files) {
      if (req.files["file"] && req.files["file"][0]) {
        const oldFilePath = currentResource.filepath;
        filepath = "/resources/" + req.files["file"][0].filename;

        console.log('[updateResource] New file uploaded', {
          timestamp: new Date().toISOString(),
          resource_id: id,
          newFile: req.files["file"][0].filename,
          oldFile: oldFilePath,
          size: req.files["file"][0].size
        });

        if (oldFilePath) {
          const oldFilePathFull = path.join(__dirname, "../resources", oldFilePath);
          if (fs.existsSync(oldFilePathFull)) {
            fs.unlink(oldFilePathFull, (err) => {
              if (err) {
                console.error('[updateResource] Failed to delete old file', {
                  timestamp: new Date().toISOString(),
                  resource_id: id,
                  oldFile: oldFilePath,
                  error: err.message
                });
              } else {
                console.log('[updateResource] Old file deleted', {
                  timestamp: new Date().toISOString(),
                  resource_id: id,
                  deletedFile: oldFilePath
                });
              }
            });
          }
        }
      }

      if (req.files["banner"] && req.files["banner"][0]) {
        const oldBannerPath = currentResource.banner;
        bannerPath = "/resources/" + req.files["banner"][0].filename;

        console.log('[updateResource] New banner uploaded', {
          timestamp: new Date().toISOString(),
          resource_id: id,
          newBanner: req.files["banner"][0].filename,
          oldBanner: oldBannerPath
        });

        if (oldBannerPath) {
          fs.unlink(path.join(__dirname, "../resources", oldBannerPath), (err) => {
            if (err) {
              console.error('[updateResource] Failed to delete old banner', {
                timestamp: new Date().toISOString(),
                resource_id: id,
                error: err.message
              });
            }
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
      console.warn('[updateResource] Resource not found', {
        timestamp: new Date().toISOString(),
        resource_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
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
    
    console.log('[updateResource] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: message
    });

    await broadcastResources(io);

    console.log('[updateResource] Request successful', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      title,
      status,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Resource updated successfully" });
  } catch (error) {
    console.error('[updateResource] Request failed', {
      timestamp: new Date().toISOString(),
      resource_id: req.params.id,
      title: req.body.title,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteResources = async (req, res) => {
  const startTime = Date.now();
  try {
    const io = req.io;
    const { ids, staff_name = "Unknown", staff_position = "Unknown" } = req.body;

    console.log('[deleteResources] Request started', {
      timestamp: new Date().toISOString(),
      resourceCount: ids?.length || 0,
      ids,
      staff_name,
      staff_position,
      ip: req.ip
    });

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.warn('[deleteResources] Validation failed - no IDs provided', {
        timestamp: new Date().toISOString(),
        ids
      });
      
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    // Step 1: Fetch titles and isResource before deleting
    const [rows] = await db.query(
      `SELECT ID, title, isResource FROM resources WHERE ID IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    console.log('[deleteResources] Resources fetched for deletion', {
      timestamp: new Date().toISOString(),
      requestedCount: ids.length,
      foundCount: rows.length,
      titles: rows.map(r => r.title)
    });

    // Step 2: Insert summary log for multiple deletions (only if more than 1)
    if (ids.length > 1) {
      const isResourceType = rows.length > 0 ? rows[0].isResource === 1 : true;
      const typeLabel = isResourceType ? "resources" : "wellness";
        
      const summaryMessage = `${staff_position}: ${staff_name} deleted ${ids.length} ${typeLabel}`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [summaryMessage]);
      
      console.log('[deleteResources] Summary activity logged', {
        timestamp: new Date().toISOString(),
        activityMessage: summaryMessage
      });
    }

    // Step 3: Log each deletion individually
    for (const row of rows) {
      const type = row.isResource ? "resource" : "wellness";
      const message = `${staff_position}: ${staff_name} deleted the ${type} titled "${row.title}"`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }

    // Step 4: Delete the resources
    const deletedCount = await resourcesService.deleteResources(ids);

    if (deletedCount === 0) {
      console.warn('[deleteResources] No resources found to delete', {
        timestamp: new Date().toISOString(),
        ids,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "No matching resources found" });
    }

    // Step 5: Broadcast updated resources list
    await broadcastResources(io);

    console.log('[deleteResources] Request successful', {
      timestamp: new Date().toISOString(),
      deletedCount,
      requestedIds: ids,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Resources deleted successfully", count: deletedCount });
  } catch (error) {
    console.error('[deleteResources] Request failed', {
      timestamp: new Date().toISOString(),
      ids: req.body.ids,
      staff_name: req.body.staff_name,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteResource = async (req, res) => {
  const startTime = Date.now();
  try {
    const io = req.io;
    const { id } = req.params;
    const { staff_name = "Unknown", staff_position = "Unknown" } = req.body;

    console.log('[deleteResource] Request started', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      staff_name,
      staff_position,
      ip: req.ip
    });

    // Step 1: Get the resource to log title and isResource before deletion
    const [rows] = await db.query("SELECT title, isResource FROM resources WHERE ID = ?", [id]);
    
    if (rows.length === 0) {
      console.warn('[deleteResource] Resource not found', {
        timestamp: new Date().toISOString(),
        resource_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Resource not found" });
    }
    
    const { title, isResource } = rows[0];
    const type = isResource ? "resource" : "wellness";

    // Step 2: Delete the resource
    const deletedCount = await resourcesService.deleteResources([id]);

    if (deletedCount === 0) {
      console.warn('[deleteResource] Delete operation failed', {
        timestamp: new Date().toISOString(),
        resource_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Resource not found" });
    }

    // Step 3: Log the deletion
    const message = `${staff_position}: ${staff_name} deleted the ${type} titled "${title}"`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    
    console.log('[deleteResource] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: message
    });

    // Step 4: Broadcast updated resource list
    await broadcastResources(io);

    console.log('[deleteResource] Request successful', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      title,
      type,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error('[deleteResource] Request failed', {
      timestamp: new Date().toISOString(),
      resource_id: req.params.id,
      staff_name: req.body.staff_name,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getResourcesAndWellness = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[getResourcesAndWellness] Request started', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // Get all resources (isResource = 1)
    const [resources] = await db.query(
      `
      SELECT ID, title, category, views, banner, filepath, resourceType, posted_at
      FROM resources
      WHERE isResource = 1
      ORDER BY category, views DESC;
      `
    );

    // Get all wellness items (isResource = 0)
    const [wellness] = await db.query(
      `
      SELECT ID, title, category, views, banner, filepath, resourceType, posted_at
      FROM resources
      WHERE isResource = 0
      ORDER BY views DESC;
      `
    );

    console.log('[getResourcesAndWellness] Request successful', {
      timestamp: new Date().toISOString(),
      resourceCount: resources.length,
      wellnessCount: wellness.length,
      totalCount: resources.length + wellness.length,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({
      resources,
      wellness,
    });
  } catch (error) {
    console.error('[getResourcesAndWellness] Request failed', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.incrementView = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    console.log('[incrementView] Request started', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      ip: req.ip
    });

    const affectedRows = await resourcesService.incrementView(id);

    if (affectedRows === 0) {
      console.warn('[incrementView] Resource not found', {
        timestamp: new Date().toISOString(),
        resource_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ 
        success: false,
        message: "Resource not found" 
      });
    }

    const resource = await resourcesService.getResourceById(id);

    console.log('[incrementView] Request successful', {
      timestamp: new Date().toISOString(),
      resource_id: id,
      title: resource.title,
      newViewCount: resource.views,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ 
      success: true,
      message: "View count incremented", 
      views: resource.views 
    });
  } catch (err) {
    console.error('[incrementView] Request failed', {
      timestamp: new Date().toISOString(),
      resource_id: req.params.id,
      error: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: err.message 
    });
  }
};