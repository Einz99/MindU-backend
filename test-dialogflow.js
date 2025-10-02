// test-dialogflow.js
// Run this script to test your Dialogflow connection independently
// Usage: node test-dialogflow.js

const { getDialogflowResponse, testDialogflowConnection } = require('./dialogflowService');

async function runTests() {
  console.log('🚀 Starting Dialogflow tests...\n');

  // Test 1: Connection test
  console.log('📡 Test 1: Testing Dialogflow connection...');
  try {
    const connectionResult = await testDialogflowConnection();
    if (connectionResult) {
      console.log('✅ Connection test passed\n');
    } else {
      console.log('❌ Connection test failed\n');
      return;
    }
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    return;
  }

  // Test 2: Simple message test
  console.log('💬 Test 2: Testing simple message...');
  try {
    const response = await getDialogflowResponse('Hello', 'test-user-123');
    console.log('✅ Simple message test passed');
    console.log('📝 Response:', response, '\n');
  } catch (error) {
    console.error('❌ Simple message test failed:', error.message, '\n');
  }

  // Test 3: Complex message test
  console.log('🤔 Test 3: Testing complex message...');
  try {
    const response = await getDialogflowResponse('I need help with my studies', 'test-user-456');
    console.log('✅ Complex message test passed');
    console.log('📝 Response:', response, '\n');
  } catch (error) {
    console.error('❌ Complex message test failed:', error.message, '\n');
  }

  console.log('🏁 All tests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});