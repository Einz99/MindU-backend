// routes/resourcesRoutes.js
const express = require("express");
const router = express.Router();
const resourcesController = require("../controllers/resourcesController");
const multer = require("multer");
const path = require("path");
const { compressAndResize, compressImage, isImage } = require('../utils/imageCompression');
const fs = require('fs');


// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/temp"));
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + "-" + file.originalname;
    cb(null, filename);
  },
});

const compressUploads = async (req, res, next) => {
  try {
    if (!req.files) return next();
    
    const finalDir = path.join(__dirname, '../public/resources');
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    
    // Process banner (always an image - compress)
    if (req.files['banner'] && req.files['banner'][0]) {
      const bannerFile = req.files['banner'][0];
      const finalPath = path.join(finalDir, bannerFile.filename);
      
      console.log('[compressUploads] Processing banner:', bannerFile.mimetype);
      await compressAndResize(bannerFile, finalPath, {
        width: 1200,
        quality: 85
      });
      console.log('[compressUploads] Banner processed');
    }
    
    // Process main file (could be image, video, or document)
    if (req.files['file'] && req.files['file'][0]) {
      const mainFile = req.files['file'][0];
      const finalPath = path.join(finalDir, mainFile.filename);
      const mimetype = mainFile.mimetype;
      
      console.log('[compressUploads] Processing main file:', mimetype);
      
      if (isImage(mimetype)) {
        // Compress images
        await compressImage(mainFile, finalPath, 85);
        console.log('[compressUploads] Image compressed');
      } else if (mimetype.startsWith('video/')) {
        // Move videos without compression
        fs.renameSync(mainFile.path, finalPath);
        console.log('[compressUploads] Video moved (no compression)');
      } else {
        // Move documents/other files without compression
        fs.renameSync(mainFile.path, finalPath);
        console.log('[compressUploads] Document moved (no compression)');
      }
    }
    
    next();
  } catch (error) {
    console.error('[compressUploads] Error:', error);
    next(error);
  }
};

const upload = multer({ storage });

// Use fields to support both file and banner
router.post(
  "/",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  compressUploads,  // Add this middleware
  resourcesController.createResource
);

// Update PUT route similarly to support file and banner updates
router.put(
  "/:id",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  compressUploads,  // Add this middleware
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
