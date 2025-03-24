const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../db");
// const bcrypt = require("bcrypt");

const broadcastUpdates = async (io, userId) => {
  if (!io) {
    console.log("⚠️ WebSocket (io) not available.");
    return;
  }

  try {
    io.emit("updateStudent", userId); // Emit the latest state of resources
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
    // Await the query result (no callback)
    const [results] = await db.query(sql, [identifier]);
    if (results.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = results[0];

    // BCRYPT: If using bcrypt, uncomment the lines below:
    // const isMatch = bcrypt.compareSync(password, user.password);
    // if (!isMatch) {
    //     return res.status(401).json({ message: "Incorrect password" });
    // }

    // Temporary plain text password check
    if (password !== user.password) {
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

exports.getUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const sql = "SELECT id, firstName, lastName, section, adviser, age, gender, profilePic FROM students WHERE id = ?";
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

    // BCRYPT: If using bcrypt, uncomment the lines below:
    // let hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const sql = "UPDATE students SET password = ?, firstLogin = ? WHERE id = ?";
    const [result] = await db.query(sql, [password, firstLogin, userId]);
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Database error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!newPassword || !email) {
    return res
      .status(400)
      .json({ message: "Provide a new password and an email." });
  }

  // BCRYPT: If using bcrypt, uncomment the line below:
  // const hashedPassword = await bcrypt.hash(newPassword, 10);

  let sql = "UPDATE students SET password = ? WHERE email = ?";
  let params = [newPassword, email];

  try {
    const [results] = await db.query(sql, params);
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }
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
