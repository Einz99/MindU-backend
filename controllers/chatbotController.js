// controllers/chatbotController.js
const chatbotService = require('../services/chatbotService');

exports.sendMessage = async (req, res) => {
  const { message, userId } = req.body;

  // Validate input
  if (!userId || !message) {
    console.log('Missing required fields:', { userId: !!userId, message: !!message });
    return res.status(400).json({ 
      error: 'User ID and message are required',
      received: { userId: !!userId, message: !!message }
    });
  }

  // Validate message is not empty string
  if (typeof message !== 'string' || message.trim().length === 0) {
    console.log('Invalid message format:', typeof message, message);
    return res.status(400).json({ 
      error: 'Message must be a non-empty string' 
    });
  }

  try {
    
    // Call the service to handle the chat logic (store and get response)
    const botResponse = await chatbotService.handleChat(
      message.trim(), 
      userId, 
      req.io || req.app.locals.io // Handle different ways io might be passed
    );
    
    res.status(200).json({ 
      fulfillmentText: botResponse,
      success: true
    });
    
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
    res.status(500).json({ 
      error: 'Failed to process your message. Please try again.',
      success: false
    });
  }
};

exports.getConversation = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    console.log('Missing userId parameter');
    return res.status(400).json({ 
      error: 'User ID is required' 
    });
  }

  try {
    // Fetch chatbot history (bot and user messages)
    const botConversation = await chatbotService.getConversationHistory(userId);

    // Fetch office chat history (office and user messages)
    const officeConversation = await chatbotService.getOfficeChatHistory(userId);

    res.status(200).json({ 
      botConversation,
      officeConversation,
      success: true
    });
    
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversation history',
      success: false
    });
  }
};

exports.getOfficeChatConversation = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    console.log('Missing userId parameter');
    return res.status(400).json({ 
      error: 'User ID is required' 
    });
  }

  try {
    // Fetch conversation history from office_chat table
    const conversation = await chatbotService.getOfficeChatHistory(userId);
    
    res.status(200).json({ 
      conversation,
      success: true
    });
    
  } catch (error) {
    console.error('Error fetching office chat history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch office chat history',
      success: false
    });
  }
};

exports.getHelp = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      console.log('Missing userId parameter');
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    await chatbotService.askHelp(userId);
    
    // Emit real-time update to all connected agents
    if (req.io) {
      req.io.emit('new-help-request', {
        userId,
        timestamp: new Date()
      });
      console.log('Emitted new-help-request event');
    }
    
    res.status(200).json({
      success: true,
    })
  } catch (error) {
    console.error('Error occurred during getHelp:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      success: false
    });
  }
}

exports.getStudentAFH = async (req, res) => {
  try {
    const results = await chatbotService.getStudentAFH();

    // Check if results is an array
    if (!Array.isArray(results)) {
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

    res.json({ studentHistory: response });

  } catch (error) {
    console.error("Error fetching student chat history:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      console.log('Missing userId parameter');
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    // Update the status of the student
    await chatbotService.updateStatus(userId);

    // Return success response
    res.status(200).json({
      success: true,
    });
    
  } catch (error) {
    console.error('Error occurred during updateStatus:', error); // Debugging error
    res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      success: false
    });
  }
};

exports.insertChatMessage = async (req, res) => {
  const { student_id, message, is_from_office } = req.body;
  
  if (student_id == null || !message || typeof is_from_office !== 'boolean') {
    return res.status(400).json({ error: 'Student ID, message, and is_from_office are required' });
  }

  try {
    // Call the service to insert message into office_chat
    await chatbotService.insertChatMessage(student_id, message, is_from_office);

    // Emit event to notify the room
    if (req.io) {
      const studentRoom = `student-${student_id}`;
      
      // Emit to the student's room (this will reach everyone in that room)
      req.io.to(studentRoom).emit('new-chat-message', { 
        student_id, 
        message, 
        is_from_office 
      });

    } else {
      console.warn('⚠️ Socket.io instance not available');
    }

    res.status(200).json({ success: true, message: 'Message inserted successfully' });
  } catch (error) {
    console.error('❌ Error inserting chat message:', error);
    res.status(500).json({ error: 'An error occurred while inserting the message' });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      console.log('Missing userId parameter');
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    await chatbotService.deactivate(userId);

    // Emit real-time update when chat is completed
    if (req.io) {
      req.io.emit('help-request-completed', {
        userId,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
    });
    
  } catch (error) {
    console.error('Error occurred during updateStatus:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request.',
      success: false
    });
  }
}

exports.addAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await chatbotService.addAlert(id);

    if (result.success) {
      // 🆕 Emit real-time event for new alert
      if (req.io) {
        req.io.emit('new-alert-created', {
          studentId: id,
          alertId: result.alertId,
          timestamp: new Date()
        });
      }

      res.status(200).json({
        success: true,
        message: result.message,
        alertId: result.alertId,
        isFirstAlert: result.isFirstAlert
      });
    } else {
      res.status(429).json({
        success: false,
        message: result.message,
        cooldownRemaining: result.cooldownRemaining
      });
    }
  } catch (error) {
    console.error('Error occurred during adding of alert:', error);
    res.status(500).json({
      error: 'An error occurred while processing your request',
      success: false
    });
  }
};

exports.getAlert = async (req, res) => {
  try {
    const rows = await chatbotService.getAllAlerts();
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
    
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
};

// Controller
exports.resolveAll = async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await chatbotService.resolveAllbyStudent(id);

    // 🆕 Emit real-time event for resolved alerts
    if (req.io) {
      req.io.emit('alerts-resolved', {
        studentId: id,
        affectedRows: affectedRows,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: `Resolved ${affectedRows} alert(s)`,
      affectedRows: affectedRows
    });
  } catch (error) {
    console.error('error resolving all alerts: ', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alerts',
      error: error.message
    });
  }
};