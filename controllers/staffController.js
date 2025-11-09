// controllers/staffController.js
const staffService = require("../services/staffService");
const axios = require("axios");
const { Resend } = require('resend');
const bcrypt = require("bcrypt");
const db = require('../db');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to send welcome email
async function sendWelcomeEmail(staff) {
  try {
    await resend.emails.send({
      from: 'MindU <onboarding@resend.dev>', // Use your verified domain later
      to: staff.email,
      subject: 'Welcome to MindU',
      html: `
        <p>Welcome ${staff.name},</p>
        <p>Your account has been created successfully.</p>
        <p>Your temporary password is <strong>${staff.randomPassword}</strong>. Please change it immediately.</p>
        <p>Best regards,</p>
        <p>The MindU Team</p>
        <p><em>Note: This is an automated message, please do not reply.</em></p>
      `,
    });
    console.log(`Welcome email sent to ${staff.email}`);
  } catch (error) {
    console.error(`Failed to send welcome email to ${staff.email}:`, error);
    // Don't throw - we don't want email failure to break staff creation
  }
}

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
    throw error; // Throw here because reset flow requires email
  }
}

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
    const { adding_name, adding_position } = req.body;
    let logMessage = `${adding_position}: ${adding_name} added a new ${newStaff.position}`;
    if (newStaff.position === "Adviser" && newStaff.section) {
      logMessage += ` of section ${newStaff.section}`;
    }
    logMessage += ` named ${newStaff.name}`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [logMessage]);

    // Send welcome email asynchronously (don't block response)
    sendWelcomeEmail(newStaff).catch(err => {
      console.error('Email sending failed, but staff created:', err);
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
    const updatedStaff = await staffService.getStaffById(id);
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
    
    const [staffRows] = await db.query('SELECT name, position FROM staffs WHERE id = ?', [id]);
    if (staffRows.length === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }
    
    const staffToDelete = staffRows[0];
    const [deleteResult] = await db.query('DELETE FROM staffs WHERE id = ?', [id]);
    
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const message = `${staffPosition}: ${staffName} removed a staff with position ${staffToDelete.position} named ${staffToDelete.name}.`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);

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
};

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
    const picture = req.file ? req.file.filename : null;
    const updated = await staffService.updateStaffPicture(id, picture);
    
    if (!updated) {
      return res.status(404).json({ message: "Staff not found" });
    }

    return res.status(200).json({
      message: "Staff picture updated successfully",
      data: { picturePath: picture },
    });
  } catch (error) {
    console.error("Error updating staff picture:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.loginStaff = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const staff = await staffService.getStaffByEmail(email);
    if (!staff) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

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
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://mindu-backend-production.up.railway.app',
        grant_type: 'authorization_code',
      },
    });

    const { id_token, access_token } = response.data;
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
};

exports.checkUser = async (req, res) => {
  const { email } = req.body;
  
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
  } catch (error) {
    console.error("Error checking user:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const resetCodes = new Map();

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await staffService.checkUser(email);
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
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

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  
  try {
    await staffService.updateForgotPassword(email, newPassword);
    resetCodes.delete(email);
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.bulkInsertAdvisers = async (req, res) => {
  try {
    const { staffs } = req.body;
    
    if (!Array.isArray(staffs) || staffs.length === 0) {
      return res.status(400).json({ message: "Invalid request. Provide an array of advisers." });
    }

    const result = await staffService.bulkInsertAdvisers(staffs);
    
    return res.status(200).json({
      message: `${result.insertedCount} advisers inserted successfully.`,
      skipped: result.skippedCount > 0 ? `${result.skippedCount} were skipped (already exist).` : "No duplicates found.",
    });
  } catch (error) {
    console.error("Bulk insert advisers failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};