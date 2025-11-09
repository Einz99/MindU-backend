const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const bcrypt = require("bcrypt");
const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const broadcastUpdates = async (io, userId) => {
  if (!io) {
    console.log("⚠️ WebSocket (io) not available.");
    return;
  }

  try {
    io.emit("updateStudent", userId);
  } catch (error) {
    console.error("❌ Error broadcasting updates:", error);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../resources/profile_pics");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage }).single("profilePic"); 

exports.login = async (req, res) => {
  const { identifier, password } = req.body;
  const sql = "SELECT * FROM students WHERE email = ?";
  try {
    const [results] = await db.query(sql, [identifier]);
    if (results.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = results[0];

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Generate JWT token if credentials are valid
    const accessToken = jwt.sign(
      { id: user.id, firstLogin: user.firstLogin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    return res.json({ accessToken, refreshToken, user });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.googleLogin = async (req, res) => {
  const { email } = req.body;

  try {
    const [results] = await db.query("SELECT * FROM students WHERE email = ?", [email]);

    if (results.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = results[0];

    // No password needed — Google verified email
    const accessToken = jwt.sign(
      { id: user.id, firstLogin: user.firstLogin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    return res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error("Error during Google login:", err);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.getUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const sql = "SELECT id, firstName, lastName, section, adviser, age, gender, profilePic, email, isAskingHelp FROM students WHERE id = ?";
    const [rows] = await db.query(sql, [userId]);

    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    return res.json({ user: rows[0]});
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired, please refresh" });
    }
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Database error" });
  }
};

exports.updateProfile = async (req, res) => {
  upload(req, res, async (err) => {
    const io = req.io;
    if (err) return res.status(500).json({ message: "File upload error" });

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const { age, gender } = req.body;
      
      let profilePicPath = null;
      if (req.file) {
        profilePicPath = `/resources/profile_pics/${req.file.filename}`;
      }

      const sql = "UPDATE students SET age = ?, gender = ?, profilePic = ? WHERE id = ?";
      await db.query(sql, [age, gender, profilePicPath, userId]);

      await broadcastUpdates(io, userId);
      return res.json({ success: true, message: "Profile updated successfully", profilePicPath });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Database error" });
    }
  });
};

exports.updatePassword = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { password, firstLogin } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    const passwordLength = password.length;

    const sql = "UPDATE students SET password = ?, passwordLength = ?, firstLogin = ? WHERE id = ?";
    const [result] = await db.query(sql, [hashedPassword, passwordLength, firstLogin, userId]);
    
    await broadcastUpdates(req.io, userId);
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Database error" });
  }
};

const resetCodes = new Map();

// Helper function to send reset code email
async function sendResetCodeEmail(email, code) {
  try {
    await resend.emails.send({
      from: 'MindU <onboarding@resend.dev>',
      to: email,
      subject: 'Password Reset Code',
      html: `
        <p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,</p>
        <p>The MindU Team</p>
        <p><em>Note: This is an automated message, please do not reply.</em></p>
      `,
    });
    console.log(`Reset code email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send reset code to ${email}:`, error);
    throw error;
  }
}

exports.sendCode = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const query = "SELECT * FROM students WHERE email = ?";

  try {
    const [user] = await db.query(query, [email]);
    if (!user || user.length === 0) { 
      return res.status(404).json({ message: "User does not exist" });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    resetCodes.set(email, code);

    await sendResetCodeEmail(email, code);
    
    setTimeout(() => { 
      resetCodes.delete(email);
    }, 10 * 60 * 1000);

    return res.status(200).json({ message: "Verification code sent to email" });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;
  const storedCode = resetCodes.get(email);

  if (storedCode && storedCode === code) {
    res.json({ valid: true });
  } else {
    res.status(400).json({ valid: false, message: "Invalid or expired code" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!newPassword || !email) {
    return res.status(400).json({ message: "Provide a new password and an email." });
  }

  // Hash the password with bcrypt
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const passwordLength = newPassword.length;

  const sql = "UPDATE students SET password = ?, passwordLength = ? WHERE email = ?";
  const params = [hashedPassword, passwordLength, email];

  try {
    const [results] = await db.query(sql, params);
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    
    // Clear the reset code after successful password reset
    resetCodes.delete(email);
    
    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Database error." });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(403).json({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id, firstLogin: decoded.firstLogin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

exports.updateEmail = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { email } = req.body;

    // Check if email is valid and not already in use
    if (!email) return res.status(400).json({ message: "Email is required" });
    
    // Check if email already exists for another user
    const [existingUser] = await db.query("SELECT id FROM students WHERE email = ? AND id != ?", [email, userId]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const sql = "UPDATE students SET email = ? WHERE id = ?";
    const [result] = await db.query(sql, [email, userId]);
    
    await broadcastUpdates(req.io, userId);
    return res.json({ success: true, message: "Email updated successfully" });
  } catch (error) {
    console.error("Error updating email:", error);
    return res.status(500).json({ message: "Database error" });
  }
};

exports.updateProfilePic = async (req, res) => {
  upload(req, res, async (err) => {
    const io = req.io;
    if (err) return res.status(500).json({ message: "File upload error" });

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      
      // If no file uploaded
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Get current profile pic path to delete
      const [user] = await db.query("SELECT profilePic FROM students WHERE id = ?", [userId]);
      const oldProfilePic = user[0]?.profilePic;
      
      // Set new profile pic path
      const profilePicPath = `/resources/profile_pics/${req.file.filename}`;

      // Update in database
      const sql = "UPDATE students SET profilePic = ? WHERE id = ?";
      await db.query(sql, [profilePicPath, userId]);
      
      // Delete old profile pic if exists and isn't default
      if (oldProfilePic && !oldProfilePic.includes('default')) {
        const oldFilePath = path.join(__dirname, '..', oldProfilePic);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      await broadcastUpdates(io, userId);
      return res.json({ 
        success: true, 
        message: "Profile picture updated successfully", 
        profilePicPath 
      });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      return res.status(500).json({ message: "Database error" });
    }
  });
};