// dialogflowService.js - Fixed with proper fallback handling
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

// Configuration
const CONFIG = {
  CONFIDENCE_THRESHOLD: 0.2, // Lowered to catch more intents (was 0.4)
  TIMEOUT_MS: 10000,
  FALLBACK_RESPONSE: 'I\'m not quite sure how to help with that. Could you please rephrase or ask something else?'
};

/**
 * Get response from Dialogflow
 * @param {string} userMessage - The user's message
 * @param {string} userId - Unique user identifier
 * @returns {Promise<string>} - Bot response
 */
async function getDialogflowResponse(userMessage, userId) {
  try {
    // Use consistent session ID per user
    const sessionId = `session-${userId}`;
    
    // Create the session path - CRITICAL: must match exactly
    const sessionPath = client.projectAgentSessionPath(credentials.project_id, sessionId);
    
    console.log('📤 Sending to Dialogflow:', {
      message: userMessage,
      sessionId,
      projectId: credentials.project_id,
      sessionPath,
      timestamp: new Date().toISOString()
    });

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userMessage,
          languageCode: 'en', // Match console: just 'en'
        },
      },
    };
    
    // Debug: Log the full request structure
    console.log('📋 Request structure:', JSON.stringify(request, null, 2));

    // Add timeout to the Dialogflow request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Dialogflow request timeout')), CONFIG.TIMEOUT_MS);
    });

    const dialogflowPromise = client.detectIntent(request);

    // Race between the actual request and timeout
    const responses = await Promise.race([dialogflowPromise, timeoutPromise]);
    
    // IMPORTANT: responses is an array, get the first element
    const response = responses[0];
    const result = response.queryResult;
    
    // Log the RAW response to compare with console
    console.log('📥 RAW Dialogflow Response:', JSON.stringify({
      responseId: response.responseId,
      queryText: result.queryText,
      intent: result.intent?.displayName,
      confidence: result.intentDetectionConfidence,
      fulfillmentText: result.fulfillmentText,
      languageCode: result.languageCode
    }, null, 2));
    
    // Log detailed response information
    console.log('📥 Dialogflow Response:', {
      intent: result.intent?.displayName || 'No intent matched',
      confidence: result.intentDetectionConfidence,
      fulfillmentText: result.fulfillmentText,
      allRequiredParamsPresent: result.allRequiredParamsPresent,
      action: result.action,
      parameters: result.parameters,
      diagnosticInfo: result.diagnosticInfo
    });
    
    // Check if Small Talk is being matched when it shouldn't
    const isSmallTalk = result.intent?.displayName?.toLowerCase().includes('smalltalk') || 
                        result.action?.toLowerCase().includes('smalltalk');
    
    if (isSmallTalk) {
      console.log('ℹ️ Small Talk intent matched - consider disabling or adding more specific training phrases');
    }
    
    // NEW: Check if this is a problem with the agent itself
    if (result.intentDetectionConfidence === 0 && !result.intent) {
      console.error('❌ CRITICAL: Dialogflow returned 0 confidence with no intent.');
      console.error('This usually means:');
      console.error('1. Agent has no trained intents');
      console.error('2. Agent is not trained/published');
      console.error('3. Language code mismatch');
      console.error('4. Project ID or credentials are incorrect');
    }

    // Check if intent detection confidence is too low
    if (result.intentDetectionConfidence < CONFIG.CONFIDENCE_THRESHOLD) {
      console.warn(`⚠️ Low confidence (${result.intentDetectionConfidence}), using fallback`);
      return CONFIG.FALLBACK_RESPONSE;
    }

    // Check if it's explicitly a fallback intent
    const isFallbackIntent = result.intent?.displayName?.toLowerCase().includes('fallback') || 
                             result.intent?.isFallback;
    
    if (isFallbackIntent) {
      console.log('ℹ️ Fallback intent triggered');
    }

    // Return the fulfillment text or fallback
    const responseText = result.fulfillmentText || CONFIG.FALLBACK_RESPONSE;
    
    return responseText;
    
  } catch (error) {
    console.error('❌ Dialogflow Error Details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Return a technical difficulty message
    return 'I\'m currently experiencing technical difficulties. Please try again in a moment.';
  }
}

/**
 * Test Dialogflow connection and configuration
 */
async function testDialogflowConnection() {
  console.log('\n🧪 Testing Dialogflow Connection...\n');
  
  const testCases = [
    { message: 'Hello', expected: 'Should match greeting intent' },
    { message: 'I feel anxious', expected: 'Should match anxiety intent' },
    { message: 'xyzabc123nonsense', expected: 'Should trigger fallback' },
  ];

  try {
    for (const testCase of testCases) {
      console.log(`Testing: "${testCase.message}"`);
      const response = await getDialogflowResponse(testCase.message, 'test-user');
      console.log(`Response: "${response}"`);
      console.log(`Expected: ${testCase.expected}\n`);
    }
    
    console.log('✅ Connection test completed');
    return true;
  } catch (error) {
    console.error('❌ Dialogflow connection test failed:', error);
    return false;
  }
}

// Export the functions
module.exports = { 
  getDialogflowResponse,
  testDialogflowConnection,
  CONFIG // Export config for easy adjustment
};