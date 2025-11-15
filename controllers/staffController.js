// controllers/staffController.js
const staffService = require("../services/staffService");
const axios = require("axios");
const { Resend } = require('resend');
const bcrypt = require("bcrypt");
const db = require('../db');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('Resend API Key exists:', !!process.env.RESEND_API_KEY);
console.log('Resend API Key starts with:', process.env.RESEND_API_KEY?.substring(0, 10));

// Helper function to send welcome email
async function sendWelcomeEmail(staff) {
  console.log('[sendWelcomeEmail - Staff] STARTING email send', {
    timestamp: new Date().toISOString(),
    email: staff.email,
    name: staff.name,
    position: staff.position,
    hasRandomPassword: !!staff.randomPassword,
    randomPasswordValue: staff.randomPassword, // Temporary - remove after debugging
    hasResendKey: !!process.env.RESEND_API_KEY
  });

  if (!staff.randomPassword) {
    console.error('[sendWelcomeEmail - Staff] ERROR: No randomPassword provided!', {
      timestamp: new Date().toISOString(),
      staffKeys: Object.keys(staff)
    });
    return;
  }

  try {
    console.log('[sendWelcomeEmail - Staff] About to call resend.emails.send...');
    
    const result = await resend.emails.send({
      from: 'MindU <onboarding@mind-u.space>',
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
    
    console.log('[sendWelcomeEmail - Staff] Resend API response:', {
      timestamp: new Date().toISOString(),
      email: staff.email,
      result: result
    });
    
    console.log('[sendWelcomeEmail - Staff] Welcome email sent successfully', {
      timestamp: new Date().toISOString(),
      email: staff.email
    });
  } catch (error) {
    console.error('[sendWelcomeEmail - Staff] DETAILED ERROR:', {
      timestamp: new Date().toISOString(),
      email: staff.email,
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorResponse: error.response?.data,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    });
  }
}

// Helper function to send reset code email
async function sendResetCodeEmail(email, code) {
  try {
    console.log('[sendResetCodeEmail] Sending reset code', {
      timestamp: new Date().toISOString(),
      email,
      codeLength: code.length
    });

    await resend.emails.send({
      from: 'MindU <onboarding@mind-u.space>',
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
    
    console.log('[sendResetCodeEmail] Reset code sent successfully', {
      timestamp: new Date().toISOString(),
      email
    });
  } catch (error) {
    console.error('[sendResetCodeEmail] Failed to send reset code', {
      timestamp: new Date().toISOString(),
      email,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

exports.getAllStaffs = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[getAllStaffs] Request started', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    const staffs = await staffService.getAllStaffs();
    
    console.log('[getAllStaffs] Request successful', {
      timestamp: new Date().toISOString(),
      staffCount: staffs.length,
      positions: staffs.reduce((acc, s) => {
        acc[s.position] = (acc[s.position] || 0) + 1;
        return acc;
      }, {}),
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(staffs);
  } catch (error) {
    console.error('[getAllStaffs] Request failed', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStaffById = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    
    console.log('[getStaffById] Request started', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      ip: req.ip
    });

    const staff = await staffService.getStaffById(id);
    
    if (!staff) {
      console.warn('[getStaffById] Staff not found', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }
    
    console.log('[getStaffById] Request successful', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      name: staff.name,
      position: staff.position,
      email: staff.email,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(staff);
  } catch (error) {
    console.error('[getStaffById] Request failed', {
      timestamp: new Date().toISOString(),
      staff_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createStaff = async (req, res) => {
  const startTime = Date.now();
  try {
    const { name, email, position, section, adding_name, adding_position } = req.body;
    
    console.log('[createStaff] Request started', {
      timestamp: new Date().toISOString(),
      name,
      email,
      position,
      section,
      adding_name,
      adding_position,
      ip: req.ip
    });

    const newStaff = await staffService.createStaff(req.body);
    
    // Insert activity log message
    let logMessage = `${adding_position}: ${adding_name} added a new ${newStaff.position}`;
    if (newStaff.position === "Adviser" && newStaff.section) {
      logMessage += ` of section ${newStaff.section}`;
    }
    logMessage += ` named ${newStaff.name}`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [logMessage]);
    
    console.log('[createStaff] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: logMessage
    });

    // Send welcome email asynchronously
    sendWelcomeEmail(newStaff).catch(err => {
      console.error('[createStaff] Email sending failed after staff creation', {
        timestamp: new Date().toISOString(),
        staff_id: newStaff.id,
        email: newStaff.email,
        error: err.message
      });
    });

    console.log('[createStaff] Request successful', {
      timestamp: new Date().toISOString(),
      staff_id: newStaff.id,
      name: newStaff.name,
      position: newStaff.position,
      email: newStaff.email,
      section: newStaff.section,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(201).json({
      message: "Staff created successfully",
      staff: newStaff,
    });
  } catch (error) {
    console.error('[createStaff] Request failed', {
      timestamp: new Date().toISOString(),
      name: req.body.name,
      email: req.body.email,
      position: req.body.position,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { name, email, position, section, adding_name, adding_position } = req.body;
    
    console.log('[updateStaff] Request started', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      updates: { name, email, position, section },
      updating_by: { adding_name, adding_position },
      ip: req.ip
    });

    const updated = await staffService.updateStaff(id, req.body);
    
    if (!updated) {
      console.warn('[updateStaff] Staff not found', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }

    const updatedStaff = await staffService.getStaffById(id);
    let logMessage = `${adding_position}: ${adding_name} updated a ${updatedStaff.position}`;
    if (updatedStaff.position === "Adviser" && updatedStaff.section) {
      logMessage += ` of section ${updatedStaff.section}`;
    }
    logMessage += ` named ${updatedStaff.name}`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [logMessage]);
    
    console.log('[updateStaff] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: logMessage
    });

    console.log('[updateStaff] Request successful', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      updated_fields: Object.keys(req.body).filter(k => !k.startsWith('adding_')),
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Staff updated successfully" });
  } catch (error) {
    console.error('[updateStaff] Request failed', {
      timestamp: new Date().toISOString(),
      staff_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const staffName = req.query.staffName || "Unknown";
    const staffPosition = req.query.staffPosition || "Unknown";
    
    console.log('[deleteStaff] Request started', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      deleting_by: { staffName, staffPosition },
      ip: req.ip
    });
    
    const [staffRows] = await db.query('SELECT name, position FROM staffs WHERE id = ?', [id]);
    
    if (staffRows.length === 0) {
      console.warn('[deleteStaff] Staff not found', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }
    
    const staffToDelete = staffRows[0];
    const [deleteResult] = await db.query('DELETE FROM staffs WHERE id = ?', [id]);
    
    if (deleteResult.affectedRows === 0) {
      console.warn('[deleteStaff] Delete operation failed', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }

    const message = `${staffPosition}: ${staffName} removed a staff with position ${staffToDelete.position} named ${staffToDelete.name}.`;
    await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    
    console.log('[deleteStaff] Activity logged', {
      timestamp: new Date().toISOString(),
      activityMessage: message
    });

    console.log('[deleteStaff] Request successful', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      deleted_name: staffToDelete.name,
      deleted_position: staffToDelete.position,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error('[deleteStaff] Request failed', {
      timestamp: new Date().toISOString(),
      staff_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaffEmail = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { email, currentPassword } = req.body;

    console.log('[updateStaffEmail] Request started', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      new_email: email,
      ip: req.ip
    });

    // Retrieve staff data
    const staff = await staffService.getStaffById(id);
    
    if (!staff) {
      console.warn('[updateStaffEmail] Staff not found', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }

    // Validate the current password
    const passwordMatch = bcrypt.compareSync(currentPassword, staff.password);
    
    if (!passwordMatch) {
      console.warn('[updateStaffEmail] Incorrect current password', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        email: staff.email,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // If password is correct, update the email
    const updated = await staffService.updateStaffEmail(id, email);
    
    if (!updated) {
      console.warn('[updateStaffEmail] Staff not found', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }
    
    console.log('[updateStaffEmail] Request successful', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      new_email: email,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Staff email updated successfully" });
  } catch (error) {
    console.error('[updateStaffEmail] Request failed', {
      timestamp: new Date().toISOString(),
      staff_id: req.params.id,
      new_email: req.body.email,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaffPassword = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    console.log('[updateStaffPassword] Request started', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      ip: req.ip
    });

    const staff = await staffService.getStaffById(id);
    
    if (!staff) {
      console.warn('[updateStaffPassword] Staff not found', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }

    const passwordMatch = bcrypt.compareSync(currentPassword, staff.password);
    
    if (!passwordMatch) {
      console.warn('[updateStaffPassword] Incorrect current password', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        email: staff.email,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    await staffService.updateStaffPassword(id, newPassword);
    
    console.log('[updateStaffPassword] Request successful', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      email: staff.email,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error('[updateStaffPassword] Request failed', {
      timestamp: new Date().toISOString(),
      staff_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaffPicture = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const picture = req.file ? req.file.filename : null;
    
    console.log('[updateStaffPicture] Request started', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      picture: picture,
      hasFile: !!req.file,
      ip: req.ip
    });

    const updated = await staffService.updateStaffPicture(id, picture);
    
    if (!updated) {
      console.warn('[updateStaffPicture] Staff not found', {
        timestamp: new Date().toISOString(),
        staff_id: id,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "Staff not found" });
    }

    console.log('[updateStaffPicture] Request successful', {
      timestamp: new Date().toISOString(),
      staff_id: id,
      picture: picture,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({
      message: "Staff picture updated successfully",
      data: { picturePath: picture },
    });
  } catch (error) {
    console.error('[updateStaffPicture] Request failed', {
      timestamp: new Date().toISOString(),
      staff_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.loginStaff = async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;
  
  console.log('[loginStaff] Login attempt started', {
    timestamp: new Date().toISOString(),
    email,
    ip: req.ip
  });

  if (!email || !password) {
    console.warn('[loginStaff] Validation failed - missing credentials', {
      timestamp: new Date().toISOString(),
      hasEmail: !!email,
      hasPassword: !!password,
      ip: req.ip
    });
    
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const staff = await staffService.getStaffByEmail(email);
    
    if (!staff) {
      console.warn('[loginStaff] Login failed - user not found', {
        timestamp: new Date().toISOString(),
        email,
        ip: req.ip,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    
    if (!isMatch) {
      console.warn('[loginStaff] Login failed - incorrect password', {
        timestamp: new Date().toISOString(),
        email,
        staff_id: staff.id,
        position: staff.position,
        ip: req.ip,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { password: _, ...staffWithoutPassword } = staff;
    
    console.log('[loginStaff] Login successful', {
      timestamp: new Date().toISOString(),
      staff_id: staff.id,
      email: staff.email,
      name: staff.name,
      position: staff.position,
      ip: req.ip,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({
      message: "Login successful",
      staff: staffWithoutPassword,
    });
  } catch (error) {
    console.error('[loginStaff] Login failed - server error', {
      timestamp: new Date().toISOString(),
      email,
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.exchangeCode = async (req, res) => {
  const startTime = Date.now();
  const { code } = req.body;
  
  console.log('[exchangeCode] Token exchange started', {
    timestamp: new Date().toISOString(),
    hasCode: !!code,
    ip: req.ip
  });

  if (!code) {
    console.warn('[exchangeCode] Validation failed - missing code', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    return res.status(400).json({ message: "Authorization code is required" });
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://www.mind-u.space',
        grant_type: 'authorization_code',
      },
    });

    const { id_token, access_token } = response.data;
    
    if (!id_token) {
      console.warn('[exchangeCode] No ID token returned', {
        timestamp: new Date().toISOString(),
        hasAccessToken: !!access_token,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(400).json({ message: "No ID Token returned" });
    }

    console.log('[exchangeCode] Token exchange successful', {
      timestamp: new Date().toISOString(),
      hasIdToken: !!id_token,
      hasAccessToken: !!access_token,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({
      message: "Token exchange successful",
      id_token,
      access_token,
    });
  } catch (err) {
    console.error('[exchangeCode] Token exchange failed', {
      timestamp: new Date().toISOString(),
      error: err.response?.data || err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Error during token exchange" });
  }
};

exports.checkUser = async (req, res) => {
  const startTime = Date.now();
  const { email } = req.body;
  
  console.log('[checkUser] User check started', {
    timestamp: new Date().toISOString(),
    email,
    ip: req.ip
  });

  if (!email) {
    console.warn('[checkUser] Validation failed - missing email', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await staffService.checkUser(email);
    
    if (user) {
      console.log('[checkUser] User found', {
        timestamp: new Date().toISOString(),
        email,
        user_id: user.id,
        position: user.position,
        name: user.name,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(200).json({
        exists: true,
        id: user.id,
        position: user.position,
        name: user.name,
        section: user.section,
      });
    } else {
      console.log('[checkUser] User not found', {
        timestamp: new Date().toISOString(),
        email,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "User does not exist" });
    }
  } catch (error) {
    console.error('[checkUser] User check failed', {
      timestamp: new Date().toISOString(),
      email,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const resetCodes = new Map();

exports.forgotPassword = async (req, res) => {
  const startTime = Date.now();
  const { email } = req.body;
  
  console.log('[forgotPassword] Password reset requested', {
    timestamp: new Date().toISOString(),
    email,
    ip: req.ip
  });

  if (!email) {
    console.warn('[forgotPassword] Validation failed - missing email', {
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await staffService.checkUser(email);
    
    if (!user) {
      console.warn('[forgotPassword] User not found', {
        timestamp: new Date().toISOString(),
        email,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({ message: "User does not exist" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes.set(email, code);

    console.log('[forgotPassword] Reset code generated', {
      timestamp: new Date().toISOString(),
      email,
      user_id: user.id,
      codeLength: code.length,
      activeCodes: resetCodes.size
    });

    await sendResetCodeEmail(email, code);

    setTimeout(() => {
      resetCodes.delete(email);
      console.log('[forgotPassword] Reset code expired', {
        timestamp: new Date().toISOString(),
        email
      });
    }, 10 * 60 * 1000);

    console.log('[forgotPassword] Request successful', {
      timestamp: new Date().toISOString(),
      email,
      user_id: user.id,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Verification code sent to email" });
  } catch (error) {
    console.error('[forgotPassword] Request failed', {
      timestamp: new Date().toISOString(),
      email,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.verifyCode = async (req, res) => {
  const startTime = Date.now();
  const { email, code } = req.body;
  const storedCode = resetCodes.get(email);
  
  console.log('[verifyCode] Code verification attempted', {
    timestamp: new Date().toISOString(),
    email,
    hasStoredCode: !!storedCode,
    codeMatches: storedCode === code,
    ip: req.ip
  });
  
  if (storedCode && storedCode === code) {
    console.log('[verifyCode] Code verified successfully', {
      timestamp: new Date().toISOString(),
      email,
      duration: `${Date.now() - startTime}ms`
    });
    
    res.json({ valid: true });
  } else {
    console.warn('[verifyCode] Code verification failed', {
      timestamp: new Date().toISOString(),
      email,
      hasStoredCode: !!storedCode,
      reason: !storedCode ? 'code_not_found' : 'code_mismatch',
      duration: `${Date.now() - startTime}ms`
    });
    
    res.status(400).json({ valid: false, message: "Invalid or expired code" });
  }
};

exports.resetPassword = async (req, res) => {
  const startTime = Date.now();
  const { email, newPassword } = req.body;
  
  console.log('[resetPassword] Password reset started', {
    timestamp: new Date().toISOString(),
    email,
    ip: req.ip
  });

  try {
    await staffService.updateForgotPassword(email, newPassword);
    resetCodes.delete(email);
    
    console.log('[resetPassword] Password reset successful', {
      timestamp: new Date().toISOString(),
      email,
      remainingCodes: resetCodes.size,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error('[resetPassword] Password reset failed', {
      timestamp: new Date().toISOString(),
      email,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.bulkInsertAdvisers = async (req, res) => {
  const startTime = Date.now();
  try {
    const { staffs } = req.body;
    
    console.log('[bulkInsertAdvisers] Bulk insert started', {
      timestamp: new Date().toISOString(),
      count: staffs?.length || 0,
      ip: req.ip
    });

    if (!Array.isArray(staffs) || staffs.length === 0) {
      console.warn('[bulkInsertAdvisers] Validation failed - invalid data', {
        timestamp: new Date().toISOString(),
        isArray: Array.isArray(staffs),
        count: staffs?.length || 0
      });
      
      return res.status(400).json({ message: "Invalid request. Provide an array of advisers." });
    }

    const result = await staffService.bulkInsertAdvisers(staffs);
    
    console.log('[bulkInsertAdvisers] Bulk insert completed', {
      timestamp: new Date().toISOString(),
      totalRequested: staffs.length,
      insertedCount: result.insertedCount,
      skippedCount: result.skippedCount,
      successRate: `${((result.insertedCount / staffs.length) * 100).toFixed(2)}%`,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(200).json({
      message: `${result.insertedCount} advisers inserted successfully.`,
      skipped: result.skippedCount > 0 ? `${result.skippedCount} were skipped (already exist).` : "No duplicates found.",
    });
  } catch (error) {
    console.error('[bulkInsertAdvisers] Bulk insert failed', {
      timestamp: new Date().toISOString(),
      count: req.body.staffs?.length || 0,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};