// routes/resourcesRoutes.js
const express = require("express");
const router = express.Router();
const resourcesController = require("../controllers/resourcesController");
const multer = require("multer");
const path = require("path");

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save files to the 'resources' folder relative to your backend root
    cb(null, path.join(__dirname, "../resources"));
  },
  filename: (req, file, cb) => {
    // Prepend Date.now() to avoid filename collisions
    const filename = Date.now() + "-" + file.originalname;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Use fields to support both file and banner
router.post(
  "/",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  resourcesController.createResource
);

// Update PUT route similarly to support file and banner updates
router.put(
  "/:id",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  resourcesController.updateResource
);

// Other resource routes
router.get("/", resourcesController.getResources);
router.get("/wellness", resourcesController.getWellness);
router.get("/:id", resourcesController.getResourceById);
router.post("/delete-multiple", resourcesController.deleteResources);

module.exports = router;
