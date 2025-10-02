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
    SELECT id, FALSE, 'Requesting a live agent'
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