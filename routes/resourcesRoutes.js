// routes/resourcesRoutes.js
const express = require("express");
const router = express.Router();
const resourcesController = require("../controllers/resourcesController");
const multer = require("multer");
const path = require("path");
const { compressAndResize, compressImage, isImage } = require('../utils/imageCompression');
const fs = require('fs');

// Ensure temp directory exists
const tempDir = path.join(__dirname, "../public/temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('[Setup] Created temp directory:', tempDir);
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + "-" + file.originalname;
    cb(null, filename);
  },
});

const compressUploads = async (req, res, next) => {
  try {
    if (!req.files) {
      console.log('[compressUploads] No files to process');
      return next();
    }
    
    const finalDir = path.join(__dirname, '../public/resources');
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
      console.log('[compressUploads] Created resources directory:', finalDir);
    }
    
    // Process banner (always an image - compress)
    if (req.files['banner'] && req.files['banner'][0]) {
      const bannerFile = req.files['banner'][0];
      const finalPath = path.join(finalDir, bannerFile.filename);
      
      console.log('[compressUploads] Processing banner:', {
        filename: bannerFile.filename,
        mimetype: bannerFile.mimetype,
        tempPath: bannerFile.path,
        finalPath: finalPath,
        exists: fs.existsSync(bannerFile.path)
      });
      
      if (!fs.existsSync(bannerFile.path)) {
        throw new Error(`Banner file not found at temp location: ${bannerFile.path}`);
      }
      
      await compressAndResize(bannerFile, finalPath, {
        width: 1200,
        quality: 85
      });
      console.log('[compressUploads] Banner processed successfully');
      
      // Clean up temp file
      if (fs.existsSync(bannerFile.path)) {
        fs.unlinkSync(bannerFile.path);
        console.log('[compressUploads] Banner temp file cleaned up');
      }
    }
    
    // Process main file (could be image, video, or document)
    if (req.files['file'] && req.files['file'][0]) {
      const mainFile = req.files['file'][0];
      const finalPath = path.join(finalDir, mainFile.filename);
      const mimetype = mainFile.mimetype;
      
      console.log('[compressUploads] Processing main file:', {
        filename: mainFile.filename,
        mimetype: mimetype,
        tempPath: mainFile.path,
        finalPath: finalPath,
        exists: fs.existsSync(mainFile.path)
      });
      
      if (!fs.existsSync(mainFile.path)) {
        throw new Error(`Main file not found at temp location: ${mainFile.path}`);
      }
      
      if (isImage(mimetype)) {
        // Compress images
        await compressImage(mainFile, finalPath, 85);
        console.log('[compressUploads] Image compressed successfully');
      } else if (mimetype.startsWith('video/')) {
        // Move videos without compression
        fs.renameSync(mainFile.path, finalPath);
        console.log('[compressUploads] Video moved (no compression)');
      } else {
        // Move documents/other files without compression
        fs.renameSync(mainFile.path, finalPath);
        console.log('[compressUploads] Document moved (no compression)');
      }
      
      // Clean up temp file if it still exists (for images, after compression)
      if (fs.existsSync(mainFile.path)) {
        fs.unlinkSync(mainFile.path);
        console.log('[compressUploads] Main file temp cleaned up');
      }
    }
    
    next();
  } catch (error) {
    console.error('[compressUploads] Error:', {
      message: error.message,
      stack: error.stack,
      files: req.files
    });
    
    // Clean up any temp files on error
    if (req.files) {
      ['banner', 'file'].forEach(fieldName => {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const tempPath = req.files[fieldName][0].path;
          if (fs.existsSync(tempPath)) {
            try {
              fs.unlinkSync(tempPath);
              console.log('[compressUploads] Cleaned up temp file on error:', tempPath);
            } catch (cleanupError) {
              console.error('[compressUploads] Failed to cleanup temp file:', cleanupError);
            }
          }
        }
      });
    }
    
    next(error);
  }
};

const upload = multer({ storage });

// Use fields to support both file and banner
router.post(
  "/",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  compressUploads,
  resourcesController.createResource
);

// Update PUT route similarly to support file and banner updates
router.put(
  "/:id",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  compressUploads,
  resourcesController.updateResource
);

// Other resource routes
router.get("/", resourcesController.getResources);
router.get("/wellness", resourcesController.getWellness);
router.get("/top", resourcesController.getResourcesAndWellness);
router.get("/:id", resourcesController.getResourceById);
router.post("/increment-view/:id", resourcesController.incrementView);
router.post("/delete-multiple", resourcesController.deleteResources);
router.delete("/:id", resourcesController.deleteResource);

module.exports = router;