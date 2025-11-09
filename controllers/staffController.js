// controllers/staffController.js
const staffService = require("../services/staffService");
const axios = require("axios");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const db = require('../db');

exports.getAllStaffs = async (req, res) => {
  try {
    const staffs = await staffService.getAllStaffs();
    return res.status(200).json(staffs);
  } catch (error) {
    console.error("Error fetching staffs:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await staffService.getStaffById(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }
    return res.status(200).json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const newStaff = await staffService.createStaff(req.body);

    // Insert activity log message
    const { adding_name, adding_position } = req.body;  // These come from frontend (your staffData)
    let logMessage = `${adding_position}: ${adding_name} added a new ${newStaff.position}`;
    if (newStaff.position === "Adviser" && newStaff.section) {
      logMessage += ` of section ${newStaff.section}`;
    }
    logMessage += ` named ${newStaff.name}`;

    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [logMessage]);

    // Send welcome email (existing code)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"MindU Support" <${process.env.EMAIL_USER}>`,
      to: newStaff.email,
      subject: 'Welcome to MindU',
      html: `<p>Welcome ${newStaff.name},</p>
             <p>Your account has been created successfully.</p>
             <p>Your temporary password is ${newStaff.randomPassword}. Please change it immediately.</p>
             <p>Best regards,</p>
             <p>The MindU Team</p>
             <p>Note: This is an automated message, please do not reply.</p>`,
    });

    return res.status(201).json({
      message: "Staff created successfully",
      staff: newStaff,
    });

  } catch (error) {
    console.error("Error creating staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await staffService.updateStaff(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const { adding_name, adding_position } = req.body;
    const updatedStaff = await staffService.getStaffById(id); // Get updated staff details for logging

    let logMessage = `${adding_position}: ${adding_name} updated a ${updatedStaff.position}`;
    if (updatedStaff.position === "Adviser" && updatedStaff.section) {
      logMessage += ` of section ${updatedStaff.section}`;
    }
    logMessage += ` named ${updatedStaff.name}`;

    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [logMessage]);

    return res.status(200).json({ message: "Staff updated successfully" });
  } catch (error) {
    console.error("Error updating staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staffName = req.query.staffName || "Unknown";
    const staffPosition = req.query.staffPosition || "Unknown";

    // Get staff info before deleting
    const [staffRows] = await db.query('SELECT name, position FROM staffs WHERE id = ?', [id]);
    if (staffRows.length === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }
    const staffToDelete = staffRows[0];

    // Delete staff
    const [deleteResult] = await db.query('DELETE FROM staffs WHERE id = ?', [id]);
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Prepare log message
    const message = `${staffPosition}: ${staffName} removed a staff with position ${staffToDelete.position} named ${staffToDelete.name}.`;

    // Insert message only into ActivityLog
    await db.query(
      `INSERT INTO ActivityLog (message) VALUES (?)`,
      [message]
    );

    return res.status(200).json({ message: "Staff deleted successfully" });

  } catch (error) {
    console.error("Error deleting staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaffEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const updated = await staffService.updateStaffEmail(id, email);
    if (!updated) {
      return res.status(404).json({ message: "Staff not found" });
    }
    return res.status(200).json({ message: "Staff email updated successfully" });
  } catch (error) {
    console.error("Error updating staff email:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

exports.updateStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const staff = await staffService.getStaffById(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const passwordMatch = bcrypt.compareSync(currentPassword, staff.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    await staffService.updateStaffPassword(id, newPassword);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaffPicture = async (req, res) => {
  try {
    const { id } = req.params;
    const picture = req.file ? req.file.filename : null; // Get the filename from multer
    const updated = await staffService.updateStaffPicture(id, picture);
    if (!updated) {
      return res.status(404).json({ message: "Staff not found" });
    }
    return res.status(200).json({
      message: "Staff picture updated successfully",
      data: {
        picturePath: picture, // Return only the relative filename/path
      },
    });
  } catch (error) {
    console.error("Error updating staff picture:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

exports.loginStaff = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Get the staff record by email
    const staff = await staffService.getStaffByEmail(email);
    if (!staff) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Remove password from response for security
    const { password: _, ...staffWithoutPassword } = staff;

    return res.status(200).json({
      message: "Login successful",
      staff: staffWithoutPassword,
    });
  } catch (error) {
    console.error("Error logging in staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.exchangeCode = async (req, res) => {
  const { code } = req.body; // Get the authorization code from the request body

  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://mindu-backend-production.up.railway.app',  // Your frontend redirect URI
        grant_type: 'authorization_code',
      },
    });

    const { id_token, access_token } = response.data; // Tokens returned by Google

    if (!id_token) {
      return res.status(400).json({ message: "No ID Token returned" });
    }

    return res.status(200).json({
      message: "Token exchange successful",
      id_token,
      access_token,
    });

  } catch (err) {
    console.error('Error during token exchange:', err.response?.data || err.message);
    return res.status(500).json({ message: "Error during token exchange" });
  }
}

exports.checkUser = async (req, res) => {
  const { email } = req.body; // Get the email from the request body
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await staffService.checkUser(email);
    if (user) {
      return res.status(200).json({
        exists: true,
        id: user.id,
        position: user.position,
        name: user.name,
        section: user.section,
      });
    } else {
      return res.status(404).json({ message: "User does not exist" });
    }
  }
  catch (error) {
    console.error("Error checking user:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

const resetCodes = new Map(); // In-memory store for reset codes

exports.forgotPassword = async (req, res) => {
  const { email } = req.body; // Get the email from the request body
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await staffService.checkUser(email);
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    resetCodes.set(email, code);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"MindU Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Code',
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,</p>
      <p>The MindU Team</p>
      <p>Note: This is an automated message, please do not reply.</p>`,
    });

    setTimeout(() => { 
      resetCodes.delete(email);
    }, 10 * 60 * 1000);

    return res.status(200).json({ message: "Verification code sent to email" });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body; // Get the email and code from the request body
  const storedCode = resetCodes.get(email);

  if (storedCode && storedCode === code) {
    res.json({ valid: true });
  } else {
    res.status(400).json({ valid: false, message: "Invalid or expired code" });
  }
}

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body; // Get the email and new password from the request body
  
  try {
    await staffService.updateForgotPassword(email, newPassword);
    resetCodes.delete(email); // Remove the code after successful password reset
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

exports.bulkInsertAdvisers = async (req, res) => {
  try {
    const { staffs } = req.body;

    if (!Array.isArray(staffs) || staffs.length === 0) {
      return res.status(400).json({ message: "Invalid request. Provide an array of advisers." });
    }

    const result = await staffService.bulkInsertAdvisers(staffs);

    return res.status(200).json({
      message: `${result.insertedCount} advisers inserted successfully.`,
      skipped: result.skippedCount > 0
        ? `${result.skippedCount} were skipped (already exist).`
        : "No duplicates found.",
    });
  } catch (error) {
    console.error("Bulk insert advisers failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.bulkInsertAdvisers = async (staffs) => {
  if (!Array.isArray(staffs) || staffs.length === 0) {
    throw new Error("Invalid adviser data.");
  }

  const formattedAdvisers = staffs.map(staff => {
    const password = crypto.randomBytes(5).toString("hex");
    return {
      name: staff.name || null,
      email: staff.email || null,
      password,
      passwordLength: password.length,
      section: staff.section || null,
      randomPassword: password, // for email
    };
  });

  const emails = formattedAdvisers.map(s => s.email).filter(Boolean);
  if (emails.length === 0) throw new Error("No valid emails provided.");

  const [existingStaffs] = await db.query(
    "SELECT email FROM staffs WHERE email IN (?)",
    [emails]
  );
  const existingEmails = new Set(existingStaffs.map(s => s.email));

  const newStaffs = formattedAdvisers.filter(s => !existingEmails.has(s.email));
  if (newStaffs.length === 0) {
    return {
      insertedCount: 0,
      skippedCount: staffs.length,
      message: "All advisers already exist.",
    };
  }

  const sql = `
    INSERT INTO staffs (name, email, password, passwordLength, position, section)
    VALUES ?
  `;
  const values = newStaffs.map(s => [
    s.name,
    s.email,
    s.password,
    s.password.length,
    "Adviser",
    s.section
  ]);
  const [result] = await db.query(sql, [values]);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  for (const newStaff of newStaffs) {
    await transporter.sendMail({
      from: `"MindU Support" <${process.env.EMAIL_USER}>`,
      to: newStaff.email,
      subject: 'Welcome to MindU',
      html: `
        <p>Welcome ${newStaff.name},</p>
        <p>Your account has been created successfully.</p>
        <p><strong>Temporary Password:</strong> <code>${newStaff.randomPassword}</code></p>
        <p>Please change it immediately after login.</p>
        <p>Best regards,</p>
        <p>The MindU Team</p>
        <p><em>Note: This is an automated message, please do not reply.</em></p>
      `,
    });
  }

  return {
    insertedCount: result.affectedRows,
    skippedCount: staffs.length - newStaffs.length,
  };
};