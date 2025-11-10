// controllers/chatbotController.js
const chatbotService = require('../services/chatbotService');

exports.sendMessage = async (req, res) => {
  const { message, userId } = req.body;
  console.log('[sendMessage] Request received:', { userId, messageLength: message?.length });

  // Validate input
  if (!userId || !message) {
    console.log('[sendMessage] Missing required fields:', { userId: !!userId, message: !!message });
    return res.status(400).json({ 
      error: 'User ID and message are required',
      received: { userId: !!userId, message: !!message }
    });
  }

  // Validate message is not empty string
  if (typeof message !== 'string' || message.trim().length === 0) {
    console.log('[sendMessage] Invalid message format:', typeof message, message);
    return res.status(400).json({ 
      error: 'Message must be a non-empty string' 
    });
  }

  try {
    console.log('[sendMessage] Processing message for user:', userId);
    
    // Call the service to handle the chat logic (store and get response)
    const botResponse = await chatbotService.handleChat(
      message.trim(), 
      userId, 
      req.io || req.app.locals.io // Handle different ways io might be passed
    );
    
    console.log('[sendMessage] Bot response generated, length:', botResponse?.length);
    res.status(200).json({ 
      fulfillmentText: botResponse,
      success: true
    });
    
  } catch (error) {
    console.error('[sendMessage] Error in sendMessage controller:', error);
    res.status(500).json({ 
      error: 'Failed to process your message. Please try again.',
      success: false
    });
  }
};

exports.getConversation = async (req, res) => {
  const { userId } = req.params;
  console.log('[getConversation] Request received for user:', userId);

  if (!userId) {
    console.log('[getConversation] Missing userId parameter');
    return res.status(400).json({ 
      error: 'User ID is required' 
    });
  }

  try {
    // Fetch chatbot history (bot and user messages)
    const botConversation = await chatbotService.getConversationHistory(userId);
    console.log('[getConversation] Bot conversation retrieved, messages:', botConversation?.length);

    // Fetch office chat history (office and user messages)
    const officeConversation = await chatbotService.getOfficeChatHistory(userId);
    console.log('[getConversation] Office conversation retrieved, messages:', officeConversation?.length);

    res.status(200).json({ 
      botConversation,
      officeConversation,
      success: true
    });
    
  } catch (error) {
    console.error('[getConversation] Error fetching conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversation history',
      success: false
    });
  }
};

exports.getOfficeChatConversation = async (req, res) => {
  const { userId } = req.params;
  console.log('[getOfficeChatConversation] Request received for user:', userId);

  if (!userId) {
    console.log('[getOfficeChatConversation] Missing userId parameter');
    return res.status(400).json({ 
      error: 'User ID is required' 
    });
  }

  try {
    // Fetch conversation history from office_chat table
    const conversation = await chatbotService.getOfficeChatHistory(userId);
    console.log('[getOfficeChatConversation] Conversation retrieved, messages:', conversation?.length);
    
    res.status(200).json({ 
      conversation,
      success: true
    });
    
  } catch (error) {
    console.error('[getOfficeChatConversation] Error fetching office chat history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch office chat history',
      success: false
    });
  }
};

exports.getHelp = async (req, res) => {
  const { userId } = req.params;
  console.log('[getHelp] Help request received for user:', userId);

  try {
    if (!userId) {
      console.log('[getHelp] Missing userId parameter');
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    await chatbotService.askHelp(userId);
    console.log('[getHelp] Help status updated for user:', userId);
    
    // Emit real-time update to all connected agents
    if (req.io) {
      req.io.emit('new-help-request', {
        userId,
        timestamp: new Date()
      });
      console.log('[getHelp] Emitted new-help-request event');
    } else {
      console.log('[getHelp] Socket.io not available');
    }
    
    res.status(200).json({
      success: true,
    })
  } catch (error) {
    console.error('[getHelp] Error occurred during getHelp:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      success: false
    });
  }
}

exports.getStudentAFH = async (req, res) => {
  console.log('[getStudentAFH] Request received');
  
  try {
    const results = await chatbotService.getStudentAFH();
    console.log('[getStudentAFH] Raw results retrieved:', results?.length);

    // Check if results is an array
    if (!Array.isArray(results)) {
      console.log('[getStudentAFH] Results is not an array');
      return res.status(500).json({ message: 'Results should be an array' });
    }

    const studentHistory = results.reduce((acc, curr) => {
      const { student_id, name, lastMessage, dateTime, status, sender, text, timestamp } = curr;

      if (!acc[student_id]) {
        acc[student_id] = {
          id: student_id,
          name,
          lastMessage,
          dateTime,
          status: status === 'On-going' ? 'ongoing' : status.toLowerCase(),
          messages: []
        };
      }

      // Reversing the sender for the last message to reflect the correct display order
      acc[student_id].messages.push({
        sender: sender ? "agent" : "user", // Flip logic as you desired
        text,
        timestamp
      });

      // Check and update lastMessage if it's the most recent one (latest timestamp)
      if (curr.timestamp > acc[student_id].dateTime) {
        acc[student_id].lastMessage = text;
        acc[student_id].dateTime = curr.timestamp;
      }

      return acc;
    }, {});

    const response = Object.values(studentHistory);
    console.log('[getStudentAFH] Processed student history, count:', response.length);

    res.json({ studentHistory: response });

  } catch (error) {
    console.error("[getStudentAFH] Error fetching student chat history:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateStatus = async (req, res) => {
  const { userId } = req.params;
  console.log('[updateStatus] Request received for user:', userId);

  try {
    if (!userId) {
      console.log('[updateStatus] Missing userId parameter');
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    // Update the status of the student
    await chatbotService.updateStatus(userId);
    console.log('[updateStatus] Status updated successfully for user:', userId);

    // Return success response
    res.status(200).json({
      success: true,
    });
    
  } catch (error) {
    console.error('[updateStatus] Error occurred during updateStatus:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      success: false
    });
  }
};

exports.insertChatMessage = async (req, res) => {
  const { student_id, message, is_from_office } = req.body;
  console.log('[insertChatMessage] Request received:', { student_id, messageLength: message?.length, is_from_office });
  
  if (student_id == null || !message || typeof is_from_office !== 'boolean') {
    console.log('[insertChatMessage] Invalid parameters');
    return res.status(400).json({ error: 'Student ID, message, and is_from_office are required' });
  }

  try {
    // Call the service to insert message into office_chat
    await chatbotService.insertChatMessage(student_id, message, is_from_office);
    console.log('[insertChatMessage] Message inserted successfully');

    // Emit event to notify the room
    if (req.io) {
      const studentRoom = `student-${student_id}`;
      
      // Emit to the student's room (this will reach everyone in that room)
      req.io.to(studentRoom).emit('new-chat-message', { 
        student_id, 
        message, 
        is_from_office 
      });
      console.log('[insertChatMessage] Emitted new-chat-message to room:', studentRoom);

    } else {
      console.warn('[insertChatMessage] ⚠️ Socket.io instance not available');
    }

    res.status(200).json({ success: true, message: 'Message inserted successfully' });
  } catch (error) {
    console.error('[insertChatMessage] ❌ Error inserting chat message:', error);
    res.status(500).json({ error: 'An error occurred while inserting the message' });
  }
};

exports.deactivate = async (req, res) => {
  const { userId } = req.params;
  console.log('[deactivate] Request received for user:', userId);

  try {
    if (!userId) {
      console.log('[deactivate] Missing userId parameter');
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    await chatbotService.deactivate(userId);
    console.log('[deactivate] User deactivated successfully:', userId);

    // Emit real-time update when chat is completed
    if (req.io) {
      req.io.emit('help-request-completed', {
        userId,
        timestamp: new Date()
      });
      console.log('[deactivate] Emitted help-request-completed event');
    } else {
      console.log('[deactivate] Socket.io not available');
    }

    res.status(200).json({
      success: true,
    });
    
  } catch (error) {
    console.error('[deactivate] Error occurred during updateStatus:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      success: false
    });
  }
}

exports.addAlert = async (req, res) => {
  const { id } = req.params;
  console.log('[addAlert] Request received for student:', id);

  try {
    const result = await chatbotService.addAlert(id);

    if (result.success) {
      console.log('[addAlert] Alert added successfully:', result.alertId, 'First alert:', result.isFirstAlert);
      
      // 🆕 Emit real-time event for new alert
      if (req.io) {
        req.io.emit('new-alert-created', {
          studentId: id,
          alertId: result.alertId,
          timestamp: new Date()
        });
        console.log('[addAlert] Emitted new-alert-created event');
      } else {
        console.log('[addAlert] Socket.io not available');
      }

      res.status(200).json({
        success: true,
        message: result.message,
        alertId: result.alertId,
        isFirstAlert: result.isFirstAlert
      });
    } else {
      console.log('[addAlert] Alert creation blocked - cooldown:', result.cooldownRemaining);
      res.status(429).json({
        success: false,
        message: result.message,
        cooldownRemaining: result.cooldownRemaining
      });
    }
  } catch (error) {
    console.error('[addAlert] Error occurred during adding of alert:', error);
    res.status(500).json({
      error: 'An error occurred while processing your request',
      success: false
    });
  }
};

exports.getAlert = async (req, res) => {
  console.log('[getAlert] Request received');
  
  try {
    const rows = await chatbotService.getAllAlerts();
    console.log('[getAlert] Alerts retrieved, count:', rows.length);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
    
  } catch (error) {
    console.error('[getAlert] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
};

// Controller
exports.resolveAll = async (req, res) => {
  const { id } = req.params;
  console.log('[resolveAll] Request received for student:', id);

  try {
    const affectedRows = await chatbotService.resolveAllbyStudent(id);
    console.log('[resolveAll] Alerts resolved, count:', affectedRows);

    // 🆕 Emit real-time event for resolved alerts
    if (req.io) {
      req.io.emit('alerts-resolved', {
        studentId: id,
        affectedRows: affectedRows,
        timestamp: new Date()
      });
      console.log('[resolveAll] Emitted alerts-resolved event');
    } else {
      console.log('[resolveAll] Socket.io not available');
    }

    res.status(200).json({
      success: true,
      message: `Resolved ${affectedRows} alert(s)`,
      affectedRows: affectedRows
    });
  } catch (error) {
    console.error('[resolveAll] error resolving all alerts: ', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alerts',
      error: error.message
    });
  }
};