const db = require("../db");

// ========== STUDENT ENDPOINTS (only active FAQs) ==========

exports.getActiveFAQs = async (req, res) => {
  console.log('[getActiveFAQs] Request received');
  try {
    const [faqs] = await db.query(
      'SELECT id, category, question, answer, posted_at FROM faqs WHERE status = "posted" ORDER BY category, id'
    );
    console.log('[getActiveFAQs] Retrieved active FAQs:', faqs.length);
    
    res.json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error('[getActiveFAQs] Error fetching posted FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
};

// ========== ADMIN ENDPOINTS (all FAQs) ==========

exports.getAllFAQs = async (req, res) => {
  console.log('[getAllFAQs] Request received');
  try {
    const [faqs] = await db.query(
      'SELECT * FROM faqs ORDER BY category, id'
    );
    console.log('[getAllFAQs] Retrieved all FAQs:', faqs.length);
    
    res.json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error('[getAllFAQs] Error fetching all FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
};

// ========== ADMIN CRUD OPERATIONS ==========

exports.createFAQ = async (req, res) => {
  console.log('[createFAQ] Request received');
  try {
    const { category, question, answer, status = 'draft' } = req.body;
    console.log('[createFAQ] Data:', { category, questionLength: question?.length, answerLength: answer?.length, status });
    
    // Validate input
    if (!category || !question || !answer) {
      console.log('[createFAQ] Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Category, question, and answer are required'
      });
    }
    
    // Validate status
    if (!['draft', 'posted'].includes(status)) {
      console.log('[createFAQ] Invalid status:', status);
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
    console.log('[createFAQ] FAQ created successfully, ID:', result.insertId);
    
    res.status(201).json({
      success: true,
      message: `FAQ created as ${status}`,
      id: result.insertId,
      posted_at
    });
  } catch (error) {
    console.error('[createFAQ] Error creating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ'
    });
  }
};

exports.updateFAQ = async (req, res) => {
  const { id } = req.params;
  console.log('[updateFAQ] Request received for ID:', id);
  try {
    const { category, question, answer, status } = req.body;
    console.log('[updateFAQ] Update data:', { category, hasQuestion: !!question, hasAnswer: !!answer, status });
    
    // Check if FAQ exists
    const [existing] = await db.query('SELECT status, posted_at FROM faqs WHERE ID = ?', [id]);
    if (existing.length === 0) {
      console.log('[updateFAQ] FAQ not found:', id);
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    console.log('[updateFAQ] FAQ found, current status:', existing[0].status);
    
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
        console.log('[updateFAQ] Invalid status:', status);
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
        console.log('[updateFAQ] Setting posted_at - draft to posted');
      }
      // Clear posted_at when changing from posted to draft
      else if (status === 'draft') {
        // Always clear posted_at when status is draft
        updates.push('posted_at = ?');
        values.push(null);
        console.log('[updateFAQ] Clearing posted_at - changed to draft');
      }
    }
    
    if (updates.length === 0) {
      console.log('[updateFAQ] No fields to update');
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    values.push(id);
    console.log('[updateFAQ] Updating fields:', updates.length);
    
    await db.query(
      `UPDATE faqs SET ${updates.join(', ')} WHERE ID = ?`,
      values
    );
    console.log('[updateFAQ] FAQ updated successfully');
    
    res.json({
      success: true,
      message: 'FAQ updated successfully'
    });
  } catch (error) {
    console.error('[updateFAQ] Error updating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ'
    });
  }
};

exports.deleteFAQ = async (req, res) => {
  const { id } = req.params;
  console.log('[deleteFAQ] Request received for ID:', id);
  try {
    // Check if FAQ exists
    const [existing] = await db.query('SELECT id FROM faqs WHERE ID = ?', [id]);
    if (existing.length === 0) {
      console.log('[deleteFAQ] FAQ not found:', id);
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    console.log('[deleteFAQ] FAQ found, proceeding with deletion');
    
    await db.query('DELETE FROM faqs WHERE ID = ?', [id]);
    console.log('[deleteFAQ] FAQ deleted successfully');
    
    res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('[deleteFAQ] Error deleting FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ'
    });
  }
};

exports.deleteMultipleFAQs = async (req, res) => {
  console.log('[deleteMultipleFAQs] Request received');
  try {
    const { ids, staff_name = "Unknown", staff_position = "Unknown" } = req.body;
    console.log('[deleteMultipleFAQs] Data:', { idsCount: ids?.length, staff_name, staff_position });

    if (!Array.isArray(ids) || ids.length === 0) {
      console.log('[deleteMultipleFAQs] Invalid request - no IDs provided');
      return res.status(400).json({ message: "Invalid request, no IDs provided" });
    }

    // Fetch questions before deleting for activity log
    const [rows] = await db.query(
      `SELECT id, question FROM faqs WHERE ID IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    console.log('[deleteMultipleFAQs] FAQs to delete:', rows.length);

    // Delete FAQs
    const [result] = await db.query(
      `DELETE FROM faqs WHERE ID IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    const deletedCount = result.affectedRows;
    console.log('[deleteMultipleFAQs] Deleted count:', deletedCount);

    if (deletedCount === 0) {
      console.log('[deleteMultipleFAQs] No matching FAQs found');
      return res.status(404).json({ message: "No matching FAQs found" });
    }

    // Summary log for multiple deletes
    if (ids.length > 1) {
      const summaryMessage = `${staff_position}: ${staff_name} deleted ${ids.length} FAQs`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [summaryMessage]);
      console.log('[deleteMultipleFAQs] Summary activity log created');
    }

    // Individual logs per deleted FAQ
    for (const row of rows) {
      const message = `${staff_position}: ${staff_name} deleted FAQ: "${row.question}"`;
      await db.query("INSERT INTO ActivityLog (message) VALUES (?)", [message]);
    }
    console.log('[deleteMultipleFAQs] Individual activity logs created:', rows.length);

    res.status(200).json({ 
      message: "FAQs deleted successfully", 
      count: deletedCount 
    });
  } catch (error) {
    console.error("[deleteMultipleFAQs] Error deleting FAQs:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};


// ========== TOGGLE ENDPOINTS ==========

exports.toggleSingle = async (req, res) => {
  const { id } = req.params;
  console.log('[toggleSingle] Request received for ID:', id);
  try {
    // Get current state
    const [current] = await db.query(
      'SELECT status FROM faqs WHERE ID = ?',
      [id]
    );
    
    if (current.length === 0) {
      console.log('[toggleSingle] FAQ not found:', id);
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    // Toggle the status
    const newStatus = current[0].status === 'posted' ? 'draft' : 'posted';
    const posted_at = newStatus === 'posted' ? new Date() : null;
    console.log('[toggleSingle] Toggling status from', current[0].status, 'to', newStatus);
    
    await db.query(
      'UPDATE faqs SET status = ?, posted_at = ? WHERE ID = ?',
      [newStatus, posted_at, id]
    );
    console.log('[toggleSingle] FAQ toggled successfully');
    
    res.json({
      success: true,
      message: `FAQ changed to ${newStatus}`,
      id,
      status: newStatus,
      posted_at
    });
  } catch (error) {
    console.error('[toggleSingle] Error toggling FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle FAQ'
    });
  }
};

exports.toggleBulk = async (req, res) => {
  console.log('[toggleBulk] Request received');
  try {
    const { ids } = req.body;
    console.log('[toggleBulk] IDs to toggle:', ids?.length);
    
    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log('[toggleBulk] Invalid input - no IDs provided');
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
    console.log('[toggleBulk] FAQs found:', faqs.length);
    
    // Toggle each FAQ individually
    for (const faq of faqs) {
      const newStatus = faq.status === 'posted' ? 'draft' : 'posted';
      const posted_at = newStatus === 'posted' ? new Date() : null;
      
      await db.query(
        'UPDATE faqs SET status = ?, posted_at = ? WHERE ID = ?',
        [newStatus, posted_at, faq.id]
      );
    }
    console.log('[toggleBulk] Bulk toggle completed successfully');
    
    res.json({
      success: true,
      message: `${ids.length} FAQ(s) toggled successfully`,
      affected: ids.length
    });
  } catch (error) {
    console.error('[toggleBulk] Error bulk toggling FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk toggle FAQs'
    });
  }
};


// ========== TRIGGER ENDPOINTS ==========
exports.getActiveTriggers = async (req, res) => {
  console.log('[getActiveTriggers] Request received');
  try {
    const [triggers] = await db.query(
      'SELECT * FROM chatbotTriggers WHERE status = "active" ORDER BY id'
    );
    console.log('[getActiveTriggers] Retrieved active triggers:', triggers.length);
    
    res.json({
      success: true,
      triggers
    });
  } catch (error) {
    console.error('[getActiveTriggers] Error fetching active triggers:', error);
    res.status(500).json({  
      success: false,
      message: 'Failed to fetch triggers'
    });
  }
};

exports.getAllTriggers = async (req, res) => {
  console.log('[getAllTriggers] Request received');
  try {
    const [triggers] = await db.query(
      'SELECT * FROM chatbotTriggers ORDER BY id'
    );
    console.log('[getAllTriggers] Retrieved all triggers:', triggers.length);
    
    res.json({
      success: true,
      triggers
    });
  } catch (error) {
    console.error('[getAllTriggers] Error fetching all triggers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch triggers'
    });
  }
};

exports.createTrigger = async (req, res) => {
  console.log('[createTrigger] Request received');
  try {
    const { category, trigger, status = 'draft' } = req.body;
    console.log('[createTrigger] Data:', { category, trigger, status });

    // Validate input
    if (!category || !trigger) {
      console.log('[createTrigger] Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Category and trigger are required'
      });
    }

    if(!['draft', 'posted'].includes(status)) {
      console.log('[createTrigger] Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: 'Status must be either "draft" or "posted"'
      });
    }

    const posted_at = status === 'posted' ? new Date() : null;

    const [result] = await db.query(
      'INSERT INTO chatbotTriggers (category, chatTriggers, status, posted_at) VALUES (?, ?, ?, ?)',
      [category, trigger, status, posted_at]
    );
    console.log('[createTrigger] Trigger created successfully, ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: `Trigger created as ${status}`,
      id: result.insertId,
      posted_at
    });
  } catch (error) {
    console.error('[createTrigger] Error creating trigger:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create trigger'
    });
  }
};

exports.updateTrigger = async (req, res) => {
  const { id } = req.params;
  console.log('[updateTrigger] Request received for ID:', id);
  try {
    const { category, trigger, status } = req.body;
    console.log('[updateTrigger] Update data:', { category, trigger, status });

    // Check if trigger exists
    const [existing] = await db.query('SELECT status FROM chatbotTriggers WHERE ID = ?', [id]);
    if (existing.length === 0) {
      console.log('[updateTrigger] Trigger not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Trigger not found'
      });
    }
    console.log('[updateTrigger] Trigger found, current status:', existing[0].status);
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (trigger !== undefined) {
      updates.push('chatTriggers = ?');
      values.push(trigger);
    }
    if (status !== undefined) {
      // Validate status
      if (!['draft', 'posted'].includes(status)) {
        console.log('[updateTrigger] Invalid status:', status);
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
        console.log('[updateTrigger] Setting posted_at - draft to posted');
      }
      // Clear posted_at when changing from posted to draft
      else if (status === 'draft') {
        // Always clear posted_at when status is draft
        updates.push('posted_at = ?');
        values.push(null);
        console.log('[updateTrigger] Clearing posted_at - changed to draft');
      }
    }
    if (updates.length === 0) {
      console.log('[updateTrigger] No fields to update');
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    values.push(id);
    console.log('[updateTrigger] Updating fields:', updates.length);

    await db.query(
      `UPDATE chatbotTriggers SET ${updates.join(', ')} WHERE ID = ?`,
      values
    );
    console.log('[updateTrigger] Trigger updated successfully');
    
    res.json({
      success: true,
      message: 'Trigger updated successfully'
    });
  } catch (error) {
    console.error('[updateTrigger] Error updating trigger:', error);
    res.status(500).json({  
      success: false,
      message: 'Failed to update trigger'
    });
  }
};

exports.deleteTrigger = async (req, res) => {
  const { id } = req.params;
  console.log('[deleteTrigger] Request received for ID:', id);
  try {
    // Check if trigger exists
    const [existing] = await db.query('SELECT id FROM chatbotTriggers WHERE ID = ?', [id]);
    if (existing.length === 0) {
      console.log('[deleteTrigger] Trigger not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Trigger not found'
      });
    }
    console.log('[deleteTrigger] Trigger found, proceeding with deletion');

    await db.query('DELETE FROM chatbotTriggers WHERE ID = ?', [id]);
    console.log('[deleteTrigger] Trigger deleted successfully');

    res.json({
      success: true,
      message: 'Trigger deleted successfully'
    });
  } catch (error) {
    console.error('[deleteTrigger] Error deleting trigger:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trigger'
    });
  }
};

exports.deleteMultipleTriggers = async (req, res) => {
  console.log('[deleteMultipleTriggers] Request received');
  try {
    const { ids } = req.body;
    console.log('[deleteMultipleTriggers] IDs to delete:', ids?.length);
    
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log('[deleteMultipleTriggers] Invalid input - no IDs provided');
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of trigger IDs'
      });
    }

    const [result] = await db.query(
      `DELETE FROM chatbotTriggers WHERE ID IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    const deletedCount = result.affectedRows;
    console.log('[deleteMultipleTriggers] Deleted count:', deletedCount);

    if (deletedCount === 0) {
      console.log('[deleteMultipleTriggers] No matching triggers found');
      return res.status(404).json({
        success: false,
        message: 'No matching chatbotTriggers found'
      });
    }

    console.log('[deleteMultipleTriggers] Triggers deleted successfully');
    res.json({
      success: true,
      message: `${deletedCount} trigger(s) deleted successfully`
    });
  } catch (error) {
    console.error('[deleteMultipleTriggers] Error deleting chatbotTriggers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chatbotTriggers'
    });
  }
};