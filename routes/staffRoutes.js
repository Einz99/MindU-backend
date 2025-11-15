// routes/staffRoutes.js
const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const multer = require("multer");
const path = require("path");
const { compressAndResize } = require('../utils/imageCompression');
const fs = require('fs');

// Ensure temp directory exists
const tempDir = path.join(__dirname, "../public/temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('[Setup] Created temp directory:', tempDir);
}

// Configure storage for uploaded files (temp location)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + "-" + file.originalname;
    cb(null, filename);
  },
});

// Middleware to compress profile picture
const compressProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      console.log('[compressProfilePicture] No file to process');
      return next();
    }
    
    const finalDir = path.join(__dirname, '../public/profile');
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
      console.log('[compressProfilePicture] Created profile directory:', finalDir);
    }
    
    const profileFile = req.file;
    const finalPath = path.join(finalDir, profileFile.filename);
    
    console.log('[compressProfilePicture] Processing profile picture:', {
      filename: profileFile.filename,
      mimetype: profileFile.mimetype,
      tempPath: profileFile.path,
      finalPath: finalPath,
      exists: fs.existsSync(profileFile.path)
    });
    
    if (!fs.existsSync(profileFile.path)) {
      throw new Error(`Profile picture not found at temp location: ${profileFile.path}`);
    }
    
    // Compress and resize profile picture
    await compressAndResize(profileFile, finalPath, {
      width: 800, // Profile pictures don't need to be as large as banners
      quality: 85
    });
    console.log('[compressProfilePicture] Profile picture processed successfully');
    
    // Clean up temp file
    if (fs.existsSync(profileFile.path)) {
      fs.unlinkSync(profileFile.path);
      console.log('[compressProfilePicture] Temp file cleaned up');
    }
    
    next();
  } catch (error) {
    console.error('[compressProfilePicture] Error:', {
      message: error.message,
      stack: error.stack,
      file: req.file
    });
    
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('[compressProfilePicture] Cleaned up temp file on error');
      } catch (cleanupError) {
        console.error('[compressProfilePicture] Failed to cleanup temp file:', cleanupError);
      }
    }
    
    next(error);
  }
};

const upload = multer({ storage });

router.get("/", staffController.getAllStaffs);
router.get("/:id", staffController.getStaffById);
router.post("/", staffController.createStaff);
router.post('/bulk-insert', staffController.bulkInsertAdvisers);

router.post("/login", staffController.loginStaff);
router.post('/exchange-code', staffController.exchangeCode);
router.post('/check-user', staffController.checkUser);

router.post('/forgot-password', staffController.forgotPassword);
router.post('/verify-code', staffController.verifyCode);
router.post('/reset-password', staffController.resetPassword);

router.put("/:id", staffController.updateStaff);
router.put("/email/:id", staffController.updateStaffEmail);
router.put("/password/:id", staffController.updateStaffPassword);
router.put("/picture/:id", upload.single("picture"), compressProfilePicture, staffController.updateStaffPicture);

router.delete("/:id", staffController.deleteStaff);

module.exports = router;