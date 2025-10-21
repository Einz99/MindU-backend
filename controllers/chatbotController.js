// controllers/chatbotController.js
const chatbotService = require('../services/chatbotService');

exports.sendMessage = async (req, res) => {
  const { message, userId } = req.body;
  console.log('Received chat request:', { message, userId });

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
    console.log('Processing chat request...');
    
    // Call the service to handle the chat logic (store and get response)
    const botResponse = await chatbotService.handleChat(
      message.trim(), 
      userId, 
      req.io || req.app.locals.io // Handle different ways io might be passed
    );

    console.log('Chat request processed successfully:', botResponse);
    
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
    
    res.status(200).json({
      success: true,
    })
  } catch (error) {
    console.error('Error occurred during getHelp:', error); // Debugging error
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
  const { student_id, message, is_from_office } = req.body; // Expecting student_id, message, and is_from_office in the body
  
  if (student_id == null || !message || typeof is_from_office !== 'boolean') {
    return res.status(400).json({ error: 'Student ID, message, and is_from_office are required' });
  }

  try {
    // Call the service to insert message into office_chat with dynamic is_from_office
    await chatbotService.insertChatMessage(student_id, message, is_from_office);

    // Emit event to notify the correct room (based on sender)
    if (req.io) {
      const studentRoom = `student-${student_id}`;
      // Emit to the student's room so both the student and all agents listening will receive it
      req.io.to(studentRoom).emit('new-chat-message', { student_id, message, is_from_office });

      console.log('Emitted new-chat-message event');
    }

    res.status(200).json({ success: true, message: 'Message inserted successfully' });
  } catch (error) {
    console.error('Error inserting chat message:', error);
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

    // Update the status of the student
    await chatbotService.deactivate(userId);

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
}