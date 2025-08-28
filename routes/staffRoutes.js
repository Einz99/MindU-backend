const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const multer = require("multer");


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'resources/profile_pics/'); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.get("/", staffController.getAllStaffs);
router.get("/:id", staffController.getStaffById);
router.post("/", staffController.createStaff);
router.put("/:id", staffController.updateStaff);
router.delete("/:id", staffController.deleteStaff);
router.put("/email/:id", staffController.updateStaffEmail);
router.put("/password/:id", staffController.updateStaffPassword);
router.put("/picture/:id", upload.single("picture"), staffController.updateStaffPicture);
router.post('/bulk-insert', staffController.bulkInsertAdvisers);

router.post("/login", staffController.loginStaff);
router.post('/exchange-code', staffController.exchangeCode);
router.post('/check-user', staffController.checkUser);

router.post('/forgot-password', staffController.forgotPassword);
router.post('/verify-code', staffController.verifyCode);
router.post('/reset-password', staffController.resetPassword);


module.exports = router;
