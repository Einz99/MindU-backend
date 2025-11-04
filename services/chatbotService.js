// services/chatbotService.js - Fixed for mysql2/promise
const db = require("../db");
const { getDialogflowResponse } = require('../dialogflowService');

exports.handleChat = async (userMessage, userId, io) => {
  try {
    console.log(`Handling chat for user ${userId}: ${userMessage}`);
    
    // 1. Store the user message in the database (Promise-based)
    console.log('Step 1: Storing user message in database...');
    const insertUserMessageQuery = 'INSERT INTO chatbot_history (student_id, is_from_bot, message) VALUES (?, ?, ?)';
    
    const userInsertResult = await db.execute(insertUserMessageQuery, [userId, false, userMessage]);
    console.log('User message stored successfully, ID:', userInsertResult[0].insertId);

    // 2. Get the bot response from Dialogflow
    console.log('Step 2: Getting response from Dialogflow...');
    const botResponse = await getDialogflowResponse(userMessage, userId);
    console.log('Bot response received:', botResponse);

    // 3. Store the bot response in the database (Promise-based)
    console.log('Step 3: Storing bot response in database...');
    const insertBotMessageQuery = 'INSERT INTO chatbot_history (student_id, is_from_bot, message) VALUES (?, ?, ?)';
    
    const botInsertResult = await db.execute(insertBotMessageQuery, [userId, true, botResponse]);
    console.log('Bot message stored successfully, ID:', botInsertResult[0].insertId);

    // 4. Emit the bot response to the frontend via Socket.IO
    if (io) {
      io.emit('chat-update', {
        userId,
        message: botResponse,
        isBot: true,
      });
      console.log('Bot response emitted via Socket.IO');
    }

    console.log('Chat handling completed successfully');
    return botResponse;
    
  } catch (error) {
    console.error('Error in chatbotService:', error);
    
    // Store error message in database
    const errorMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
    try {
      console.log('Storing error message...');
      const insertErrorMessageQuery = 'INSERT INTO chatbot_history (student_id, is_from_bot, message) VALUES (?, ?, ?)';
      await db.execute(insertErrorMessageQuery, [userId, true, errorMessage]);
      console.log('Error message stored successfully');

      // Emit error message via Socket.IO
      if (io) {
        io.emit('chat-update', {
          userId,
          message: errorMessage,
          isBot: true,
        });
      }
      
    } catch (dbError) {
      console.error('Error storing error message:', dbError);
    }
    
    return errorMessage;
  }
};

exports.getConversationHistory = async (userId) => {
  try {
    const query = 'SELECT * FROM chatbot_history WHERE student_id = ? ORDER BY created_at ASC';
    
    const [results] = await db.execute(query, [userId]);
    return results;
    
  } catch (error) {
    console.error('Error in fetching conversation history:', error);
    throw new Error('Failed to fetch conversation history');
  }
};

exports.getOfficeChatHistory = async (userId) => {
  try {
    const query = `
      SELECT * 
      FROM office_chat
      WHERE student_id = ?
      ORDER BY created_at ASC;
    `;
    
    // Fetch all office chat messages for the student
    const [results] = await db.execute(query, [userId]);
    return results;
    
  } catch (error) {
    console.error('Error fetching office chat history:', error);
    throw new Error('Failed to fetch office chat history');
  }
};

exports.askHelp = async (userId) => {
  const updateQuery = `
    UPDATE students
    SET isAskingHelp = true, chatStatus = 'Pending'
    WHERE id = ?;
  `;
  
  const insertQuery = `
    INSERT INTO office_chat (student_id, is_from_office, message)
    SELECT id, FALSE, 'Connect to guidance'
    FROM students
    WHERE id = ? AND isAskingHelp = TRUE;
  `;

  // Start a transaction to ensure both operations are atomic
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction(); // Start the transaction

    // Execute the UPDATE query
    const [updateResult] = await connection.query(updateQuery, [userId]);
    
    // Execute the INSERT query
    await connection.query(insertQuery, [userId]);

    // Commit the transaction if both queries succeed
    await connection.commit();

    // Return affected rows (you can also check if the insert was successful)
    return updateResult.affectedRows;
  } catch (error) {
    // Rollback the transaction in case of any error
    await connection.rollback();
    throw error;
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
};

// In chatbotService.js

exports.getStudentAFH = async () => {
  try {
    // Ensure you're using the right query function
    const query = `
      SELECT 
          s.id AS student_id,
          CONCAT(s.firstName, ' ', s.lastName) AS name,
          oc.message AS lastMessage,
          oc.created_at AS dateTime,
          s.chatStatus AS status,
          oc.is_from_office AS sender,
          oc.message AS text,
          oc.created_at AS timestamp
      FROM students s
      JOIN office_chat oc ON s.id = oc.student_id
      WHERE s.isAskingHelp = true
        AND s.chatStatus != 'Completed'
      ORDER BY oc.created_at ASC;
    `;
    
    // Use `db.execute()` to ensure you get an array of results
    const [results] = await db.execute(query);
    
    return results;
    
  } catch (error) {
    console.error('Error fetching student chat history:', error);
    throw new Error('Failed to fetch conversation history');
  }
};

exports.updateStatus = async (userId) => {
  const updateQuery = `
    UPDATE students
    SET chatStatus = 'On-going'
    WHERE id = ?;
  `;

  const [updateResult] = await db.query(updateQuery, [userId]);
  console.log(updateResult.affectedRows);

  return updateResult.affectedRows;
}

exports.deactivate = async (userId) => {
  const updateQuery = `
    UPDATE students
    SET chatStatus = 'Completed', isAskingHelp = 0
    WHERE id = ?;
  `;

  const [updateResult] = await db.query(updateQuery, [userId]);
  console.log(updateResult.affectedRows);

  return updateResult.affectedRows;
}

exports.insertChatMessage = async (student_id, message, is_from_office) => {
  try {
    const insertQuery = `
      INSERT INTO office_chat (student_id, is_from_office, message)
      VALUES (?, ?, ?);
    `;
    await db.execute(insertQuery, [student_id, is_from_office, message]);
    console.log('Message inserted into office_chat table');
  } catch (error) {
    console.error('Error inserting chat message:', error);
    throw error; // Rethrow error to be handled in the controller
  }
};

exports.addAlert = async (studentId) => {
  try {
    // Check if there's any alert from this student
    const checkQuery = `
      SELECT id, created_at 
      FROM alerts 
      WHERE student_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const [existingAlerts] = await db.query(checkQuery, [studentId]);
    
    // If this is the first alert, always record it
    if (!existingAlerts || existingAlerts.length === 0) {
      const insertQuery = `
        INSERT INTO alerts (student_id) 
        VALUES (?)
      `;
      
      const [result] = await db.query(insertQuery, [studentId]);
      
      console.log(`✅ First alert recorded for student ${studentId}`);
      
      return {
        success: true,
        message: 'First alert successfully registered',
        alertId: result.insertId,
        isFirstAlert: true
      };
    }
    
    // If there's an existing alert, check the cooldown
    const lastAlertTime = new Date(existingAlerts[0].created_at);
    const currentTime = new Date();
    const timeDifference = (currentTime - lastAlertTime) / 1000; // Convert to seconds
    
    // If less than 60 seconds have passed, don't add new alert
    if (timeDifference < 60) {
      console.log(`⏳ Alert cooldown active for student ${studentId}. ${Math.round(60 - timeDifference)}s remaining.`);
      return {
        success: false,
        message: 'Alert cooldown active. Please wait before triggering another alert.',
        cooldownRemaining: Math.round(60 - timeDifference)
      };
    }
    
    // If cooldown has passed, insert new alert
    const insertQuery = `
      INSERT INTO alerts (student_id) 
      VALUES (?)
    `;
    
    const [result] = await db.query(insertQuery, [studentId]);
    
    console.log(`✅ Alert added for student ${studentId}`);
    
    return {
      success: true,
      message: 'Alert successfully registered',
      alertId: result.insertId,
      isFirstAlert: false
    };
    
  } catch (error) {
    console.error('Error in addAlert service:', error);
    throw error;
  }
};

exports.getAllAlerts = async () => {
    const [rows] = await db.query(`
      SELECT 
        s.firstName,
        s.lastName,
        a.is_resolved,
        a.student_id,
        a.created_at as date
      FROM alerts a
      LEFT JOIN students s ON a.student_id = s.id
    `);
    return rows;
  }

exports.resolveAllbyStudent = async (id) => {
  const query = `
    UPDATE alerts
    SET is_resolved = true
    WHERE student_id = ? AND is_resolved = false
  `; // Make sure you're only resolving unresolved alerts.
  const [rows] = await db.query(query, [id]);
  
  return rows.affectedRows;
};