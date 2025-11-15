const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const bcrypt = require("bcrypt");
const { Resend } = require('resend');
const { compressAndResize } = require('../utils/imageCompression');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY2);

const broadcastUpdates = async (io, userId) => {
  console.log('[broadcastUpdates] Broadcasting update for user:', userId);
  if (!io) {
    console.log("[broadcastUpdates] ⚠️ WebSocket (io) not available.");
    return;
  }

  try {
    io.emit("updateStudent", userId);
    console.log('[broadcastUpdates] Update emitted successfully');
  } catch (error) {
    console.error("[broadcastUpdates] ❌ Error broadcasting updates:", error);
  }
};

// Ensure temp directory exists
const tempDir = path.join(__dirname, "../public/temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('[Setup] Created temp directory:', tempDir);
}

// Configure storage for uploaded files (temp location)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[multer] Upload destination (temp):', tempDir);
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const filename = `profile_${Date.now()}${path.extname(file.originalname)}`;
    console.log('[multer] Generated filename:', filename);
    cb(null, filename);
  },
});

const upload = multer({ storage }).single("profilePic"); 

// Helper function to compress and move profile picture
const processProfilePicture = async (file) => {
  const finalDir = path.join(__dirname, '../public/profile');
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
    console.log('[processProfilePicture] Created profile directory:', finalDir);
  }
  
  const finalPath = path.join(finalDir, file.filename);
  
  console.log('[processProfilePicture] Processing profile picture:', {
    filename: file.filename,
    mimetype: file.mimetype,
    tempPath: file.path,
    finalPath: finalPath,
    exists: fs.existsSync(file.path)
  });
  
  if (!fs.existsSync(file.path)) {
    throw new Error(`Profile picture not found at temp location: ${file.path}`);
  }
  
  // Compress and resize profile picture
  await compressAndResize(file, finalPath, {
    width: 800,
    quality: 85
  });
  console.log('[processProfilePicture] Profile picture processed successfully');
  
  // Clean up temp file
  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
    console.log('[processProfilePicture] Temp file cleaned up');
  }
  
  return `/public/profile/${file.filename}`;
};

exports.login = async (req, res) => {
  const { identifier, password } = req.body;
  console.log('[login] Login attempt for:', identifier);
  
  const sql = "SELECT * FROM students WHERE email = ?";
  try {
    const [results] = await db.query(sql, [identifier]);
    if (results.length === 0) {
      console.log('[login] User not found:', identifier);
      return res.status(401).json({ message: "User not found" });
    }

    const user = results[0];
    console.log('[login] User found:', user.id, user.email);

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('[login] Incorrect password for user:', identifier);
      return res.status(401).json({ message: "Incorrect password" });
    }
    console.log('[login] Password verified successfully');

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

    console.log('[login] Tokens generated successfully for user:', user.id);
    return res.json({ accessToken, refreshToken, user });
  } catch (error) {
    console.error("[login] Error during login:", error);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.googleLogin = async (req, res) => {
  const { email } = req.body;
  console.log('[googleLogin] Google login attempt for:', email);

  try {
    const [results] = await db.query("SELECT * FROM students WHERE email = ?", [email]);

    if (results.length === 0) {
      console.log('[googleLogin] User not found:', email);
      return res.status(401).json({ message: "User not found" });
    }

    const user = results[0];
    console.log('[googleLogin] User found:', user.id, user.email);

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

    console.log('[googleLogin] Tokens generated successfully for user:', user.id);
    return res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error("[googleLogin] Error during Google login:", err);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.getUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log('[getUser] Request received');
  
  if (!token) {
    console.log('[getUser] No token provided');
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    console.log('[getUser] Token verified for user:', userId);

    const sql = "SELECT id, firstName, lastName, section, adviser, age, gender, profilePic, email, isAskingHelp FROM students WHERE id = ?";
    const [rows] = await db.query(sql, [userId]);

    if (rows.length === 0) {
      console.log('[getUser] User not found in database:', userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('[getUser] User data retrieved successfully:', userId);
    return res.json({ user: rows[0]});
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.log('[getUser] Token expired');
      return res.status(401).json({ message: "Token expired, please refresh" });
    }
    console.error("[getUser] Error fetching user:", error);
    return res.status(500).json({ message: "Database error" });
  }
};

exports.updateProfile = async (req, res) => {
  console.log('[updateProfile] Profile update request received');
  
  upload(req, res, async (err) => {
    const io = req.io;
    if (err) {
      console.error('[updateProfile] File upload error:', err);
      return res.status(500).json({ message: "File upload error" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log('[updateProfile] No token provided');
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const { age, gender } = req.body;
      console.log('[updateProfile] Updating profile for user:', userId, { age, gender });
      
      let profilePicPath = null;
      if (req.file) {
        // Process and compress the image
        profilePicPath = await processProfilePicture(req.file);
        console.log('[updateProfile] New profile picture uploaded and compressed:', profilePicPath);
      }

      const sql = "UPDATE students SET age = ?, gender = ?, profilePic = ? WHERE id = ?";
      await db.query(sql, [age, gender, profilePicPath, userId]);
      console.log('[updateProfile] Profile updated successfully');

      await broadcastUpdates(io, userId);
      return res.json({ success: true, message: "Profile updated successfully", profilePicPath });
    } catch (error) {
      console.error("[updateProfile] Error updating profile:", error);
      
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('[updateProfile] Cleaned up temp file on error');
        } catch (cleanupError) {
          console.error('[updateProfile] Failed to cleanup temp file:', cleanupError);
        }
      }
      
      return res.status(500).json({ message: "Database error" });
    }
  });
};

exports.updatePassword = async (req, res) => {
  console.log('[updatePassword] Password update request received');
  
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log('[updatePassword] No token provided');
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { password, firstLogin } = req.body;
    console.log('[updatePassword] Updating password for user:', userId, { firstLogin });

    if (!password) {
      console.log('[updatePassword] Password not provided');
      return res.status(400).json({ message: "Password is required" });
    }

    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    const passwordLength = password.length;
    console.log('[updatePassword] Password hashed successfully, length:', passwordLength);

    const sql = "UPDATE students SET password = ?, passwordLength = ?, firstLogin = ? WHERE id = ?";
    const [result] = await db.query(sql, [hashedPassword, passwordLength, firstLogin, userId]);
    console.log('[updatePassword] Password updated successfully');
    
    await broadcastUpdates(req.io, userId);
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("[updatePassword] Error updating password:", error);
    return res.status(500).json({ message: "Database error" });
  }
};

const resetCodes = new Map();

// Helper function to send reset code email
async function sendResetCodeEmail(email, code) {
  console.log('[sendResetCodeEmail] Sending reset code to:', email);
  try {
    await resend.emails.send({
      from: 'MindU <noreply@mind-u.space>',
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
    console.log(`[sendResetCodeEmail] Reset code email sent successfully to ${email}`);
  } catch (error) {
    console.error(`[sendResetCodeEmail] Failed to send reset code to ${email}:`, error);
    throw error;
  }
}

exports.sendCode = async (req, res) => {
  const { email } = req.body;
  console.log('[sendCode] Send code request for:', email);
  
  if (!email) {
    console.log('[sendCode] Email not provided');
    return res.status(400).json({ message: "Email is required" });
  }

  const query = "SELECT * FROM students WHERE email = ?";

  try {
    const [user] = await db.query(query, [email]);
    if (!user || user.length === 0) { 
      console.log('[sendCode] User does not exist:', email);
      return res.status(404).json({ message: "User does not exist" });
    }
    console.log('[sendCode] User found:', email);

    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    resetCodes.set(email, code);
    console.log('[sendCode] Reset code generated and stored');

    await sendResetCodeEmail(email, code);
    
    setTimeout(() => { 
      resetCodes.delete(email);
      console.log('[sendCode] Reset code expired and deleted for:', email);
    }, 10 * 60 * 1000);

    return res.status(200).json({ message: "Verification code sent to email" });
  } catch (error) {
    console.error("[sendCode] Error sending verification code:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;
  console.log('[verifyCode] Verifying code for:', email);
  
  const storedCode = resetCodes.get(email);

  if (storedCode && storedCode === code) {
    console.log('[verifyCode] Code verified successfully');
    res.json({ valid: true });
  } else {
    console.log('[verifyCode] Invalid or expired code');
    res.status(400).json({ valid: false, message: "Invalid or expired code" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  console.log('[forgotPassword] Password reset request for:', email);

  if (!newPassword || !email) {
    console.log('[forgotPassword] Missing email or password');
    return res.status(400).json({ message: "Provide a new password and an email." });
  }

  // Hash the password with bcrypt
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const passwordLength = newPassword.length;
  console.log('[forgotPassword] New password hashed, length:', passwordLength);

  const sql = "UPDATE students SET password = ?, passwordLength = ? WHERE email = ?";
  const params = [hashedPassword, passwordLength, email];

  try {
    const [results] = await db.query(sql, params);
    if (results.affectedRows === 0) {
      console.log('[forgotPassword] User not found:', email);
      return res.status(404).json({ message: "User not found." });
    }
    
    // Clear the reset code after successful password reset
    resetCodes.delete(email);
    console.log('[forgotPassword] Password reset successfully, code cleared');
    
    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("[forgotPassword] Error updating password:", error);
    return res.status(500).json({ message: "Database error." });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  console.log('[refreshToken] Token refresh request received');

  if (!refreshToken) {
    console.log('[refreshToken] No refresh token provided');
    return res.status(403).json({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    console.log('[refreshToken] Refresh token verified for user:', decoded.id);

    const newAccessToken = jwt.sign(
      { id: decoded.id, firstLogin: decoded.firstLogin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    console.log('[refreshToken] New access token generated');
    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('[refreshToken] Invalid refresh token:', error);
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

exports.updateEmail = async (req, res) => {
  console.log('[updateEmail] Email update request received');
  
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log('[updateEmail] No token provided');
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { email } = req.body;
    console.log('[updateEmail] Updating email for user:', userId, 'New email:', email);

    // Check if email is valid and not already in use
    if (!email) {
      console.log('[updateEmail] Email not provided');
      return res.status(400).json({ message: "Email is required" });
    }
    
    // Check if email already exists for another user
    const [existingUser] = await db.query("SELECT id FROM students WHERE email = ? AND id != ?", [email, userId]);
    if (existingUser.length > 0) {
      console.log('[updateEmail] Email already in use:', email);
      return res.status(400).json({ message: "Email already in use" });
    }

    const sql = "UPDATE students SET email = ? WHERE id = ?";
    const [result] = await db.query(sql, [email, userId]);
    console.log('[updateEmail] Email updated successfully');
    
    await broadcastUpdates(req.io, userId);
    return res.json({ success: true, message: "Email updated successfully" });
  } catch (error) {
    console.error("[updateEmail] Error updating email:", error);
    return res.status(500).json({ message: "Database error" });
  }
};

exports.updateProfilePic = async (req, res) => {
  console.log('[updateProfilePic] Profile picture update request received');
  
  upload(req, res, async (err) => {
    const io = req.io;
    if (err) {
      console.error('[updateProfilePic] File upload error:', err);
      return res.status(500).json({ message: "File upload error" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log('[updateProfilePic] No token provided');
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      console.log('[updateProfilePic] Updating profile picture for user:', userId);
      
      // If no file uploaded
      if (!req.file) {
        console.log('[updateProfilePic] No file uploaded');
        return res.status(400).json({ message: "No file uploaded" });
      }
      console.log('[updateProfilePic] File received:', req.file.filename);
      
      // Get current profile pic path to delete
      const [user] = await db.query("SELECT profilePic FROM students WHERE id = ?", [userId]);
      const oldProfilePic = user[0]?.profilePic;
      console.log('[updateProfilePic] Old profile picture:', oldProfilePic);
      
      // Process and compress the new profile picture
      const profilePicPath = await processProfilePicture(req.file);
      console.log('[updateProfilePic] New profile picture compressed:', profilePicPath);

      // Update in database
      const sql = "UPDATE students SET profilePic = ? WHERE id = ?";
      await db.query(sql, [profilePicPath, userId]);
      console.log('[updateProfilePic] Database updated with new profile picture');
      
      // Delete old profile pic if exists and isn't default
      if (oldProfilePic && !oldProfilePic.includes('default')) {
        const oldFilePath = path.join(__dirname, '..', oldProfilePic);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('[updateProfilePic] Old profile picture deleted:', oldFilePath);
        }
      }

      await broadcastUpdates(io, userId);
      return res.json({ 
        success: true, 
        message: "Profile picture updated successfully", 
        profilePicPath 
      });
    } catch (error) {
      console.error("[updateProfilePic] Error updating profile picture:", error);
      
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('[updateProfilePic] Cleaned up temp file on error');
        } catch (cleanupError) {
          console.error('[updateProfilePic] Failed to cleanup temp file:', cleanupError);
        }
      }
      
      return res.status(500).json({ message: "Database error" });
    }
  });
};