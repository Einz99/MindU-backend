const db = require("../db");

// ========== STUDENT ENDPOINTS (only active FAQs) ==========

exports.getActiveFAQs = async (req, res) => {
  try {
    const [faqs] = await db.query(
      'SELECT id, category, question, answer, posted_at FROM faqs WHERE status = "posted" ORDER BY category, id'
    );
    
    res.json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error('Error fetching posted FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
};

// ========== ADMIN ENDPOINTS (all FAQs) ==========

exports.getAllFAQs = async (req, res) => {
  try {
    const [faqs] = await db.query(
      'SELECT * FROM faqs ORDER BY category, id'
    );
    
    res.json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error('Error fetching all FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
};

// ========== ADMIN CRUD OPERATIONS ==========

exports.createFAQ = async (req, res) => {
  try {
    const { category, question, answer, status = 'draft' } = req.body;
    
    // Validate input
    if (!category || !question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Category, question, and answer are required'
      });
    }
    
    // Validate status
    if (!['draft', 'posted'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "draft" or "posted"'
      });
    }
    
    // Set posted_at if status is 'posted'
    const posted_at = status === 'posted' ? new Date() : null;
    
    const [result] = await db.query(
      'INSERT INTO faqs (category, question, answer, status, posted_at) VALUES (?, ?, ?, ?, ?)',
      [category, question, answer, status, posted_at]
    );
    
    res.status(201).json({
      success: true,
      message: `FAQ created as ${status}`,
      id: result.insertId,
      posted_at
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ'
    });
  }
};

exports.updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, question, answer, status } = req.body;
    
    // Check if FAQ exists
    const [existing] = await db.query('SELECT status, posted_at FROM faqs WHERE ID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (question !== undefined) {
      updates.push('question = ?');
      values.push(question);
    }
    if (answer !== undefined) {
      updates.push('answer = ?');
      values.push(answer);
    }
    if (status !== undefined) {
      // Validate status
      if (!['draft', 'posted'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either "draft" or "posted"'
        });
      }
      
      updates.push('status = ?');
      values.push(status);
      
      // Set posted_at when changing from draft to posted
      if (status === 'posted' && existing[0].status === 'draft') {
        updates.push('posted_at = ?');
        values.push(new Date());
      }
      // Clear posted_at when changing from posted to draft
      else if (status === 'draft' && existing[0].status === 'posted') {
        updates.push('posted_at = ?');
        values.push(null);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    values.push(id);
    
    await db.query(
      `UPDATE faqs SET ${updates.join(', ')} WHERE ID = ?`,
      values
    );
    
    res.json({
      success: true,
      message: 'FAQ updated successfully'
    });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ'
    });
  }
};

exports.deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if FAQ exists
    const [existing] = await db.query('SELECT id FROM faqs WHERE ID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    await db.query('DELETE FROM faqs WHERE ID = ?', [id]);
    
    res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ'
    });
  }
};

exports.deleteMultipleFAQs = async (req, res) => {
  try {
    const { ids, staff_name = "Unknown", staff_position = "Unknown" } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    // Fetch questions before deleting for activity log
    const [rows] = await db.query(
      `SELECT id, question FROM faqs WHERE ID IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // Delete FAQs
    const [result] = await db.query(
      `DELETE FROM faqs WHERE ID IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    const deletedCount = result.affectedRows;

    if (deletedCount === 0) {
      return res.status(404).json({ message: "No matching FAQs found" });
    }

    // Summary log for multiple deletes
    if (ids.length > 1) {
      const summaryMessage = `${staff_position}: ${staff_name} deleted ${ids.length} FAQs`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [summaryMessage]);
    }

    // Individual logs per deleted FAQ
    for (const row of rows) {
      const message = `${staff_position}: ${staff_name} deleted FAQ: "${row.question}"`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }

    res.status(200).json({ 
      message: "FAQs deleted successfully", 
      count: deletedCount 
    });
  } catch (error) {
    console.error("Error deleting FAQs:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};


// ========== TOGGLE ENDPOINTS ==========

exports.toggleSingle = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current state
    const [current] = await db.query(
      'SELECT status FROM faqs WHERE ID = ?',
      [id]
    );
    
    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    // Toggle the status
    const newStatus = current[0].status === 'posted' ? 'draft' : 'posted';
    const posted_at = newStatus === 'posted' ? new Date() : null;
    
    await db.query(
      'UPDATE faqs SET status = ?, posted_at = ? WHERE ID = ?',
      [newStatus, posted_at, id]
    );
    
    res.json({
      success: true,
      message: `FAQ changed to ${newStatus}`,
      id,
      status: newStatus,
      posted_at
    });
  } catch (error) {
    console.error('Error toggling FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle FAQ'
    });
  }
};

exports.toggleBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    
    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of FAQ IDs'
      });
    }
    
    // Get current statuses
    const placeholders = ids.map(() => '?').join(',');
    const [faqs] = await db.query(
      `SELECT id, status FROM faqs WHERE ID IN (${placeholders})`,
      ids
    );
    
    // Toggle each FAQ individually
    for (const faq of faqs) {
      const newStatus = faq.status === 'posted' ? 'draft' : 'posted';
      const posted_at = newStatus === 'posted' ? new Date() : null;
      
      await db.query(
        'UPDATE faqs SET status = ?, posted_at = ? WHERE ID = ?',
        [newStatus, posted_at, faq.id]
      );
    }
    
    res.json({
      success: true,
      message: `${ids.length} FAQ(s) toggled successfully`,
      affected: ids.length
    });
  } catch (error) {
    console.error('Error bulk toggling FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk toggle FAQs'
    });
  }
};