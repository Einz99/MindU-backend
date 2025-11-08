// dialogflowService.js
const dialogflow = require('@google-cloud/dialogflow');
const path = require('path');
const fs = require('fs');

// Path to your service account JSON key file
const KEY_FILE_PATH = path.join(__dirname, './key/mind-u-459403-a577ccddd545.json');

// Read and parse credentials from file
let credentials;
try {
  const credentialsData = fs.readFileSync(KEY_FILE_PATH, 'utf8');
  credentials = JSON.parse(credentialsData);
} catch (error) {
  console.error('❌ Error loading credentials from file:', error.message);
  console.error('Expected file path:', KEY_FILE_PATH);
  throw new Error(`Failed to load credentials: ${error.message}`);
}

// Create a new instance of the Dialogflow Sessions Client with credentials
const client = new dialogflow.SessionsClient({
  credentials: credentials,
  projectId: credentials.project_id
});

// This function will handle the Dialogflow interaction
async function getDialogflowResponse(userMessage, userId) {
  try {
    
    // Generate a unique session ID based on userId
    const sessionId = `session-${userId}-${Date.now()}`;
    
    // Create the session path using the project_id from credentials
    const sessionPath = client.projectAgentSessionPath(credentials.project_id, sessionId);
    

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userMessage,
          languageCode: 'en-US',
        },
      },
    };


    // Add timeout to the Dialogflow request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Dialogflow request timeout after 10 seconds')), 10000);
    });

    const dialogflowPromise = client.detectIntent(request);

    // Race between the actual request and timeout
    const responses = await Promise.race([dialogflowPromise, timeoutPromise]);
    
    const result = responses[0].queryResult;
    
    const responseText = result.fulfillmentText || 'I apologize, but I couldn\'t understand your message. Could you please rephrase it?';
    
    return responseText;
    
  } catch (error) {
    console.error('❌ Dialogflow Error Details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack?.substring(0, 500) + '...' // Truncate long stack traces
    });
    
    // Return a fallback response instead of throwing an error
    const fallbackResponse = 'I\'m currently experiencing technical difficulties. Please try again in a moment.';
    return fallbackResponse;
  }
}

// Test function to verify Dialogflow connection
async function testDialogflowConnection() {
  try {
    const response = await getDialogflowResponse('Hello', 'test-user');
    console.log('Test response:', response);
    return true;
  } catch (error) {
    console.error('Dialogflow connection test failed:', error);
    return false;
  }
}

// Export the functions
module.exports = { 
  getDialogflowResponse,
  testDialogflowConnection
};