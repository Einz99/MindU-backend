// routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Route to handle sending messages to Dialogflow
router.get('/get-office-chat-history/:userId', chatbotController.getOfficeChatConversation);
router.get('/get-conversation/:userId', chatbotController.getConversation);
router.get('/students-asking-for-help', chatbotController.getStudentAFH)
router.get('/alerts', chatbotController.getAlert);
router.get('/archived-chats', chatbotController.getArchivedChats);
router.post('/send-message', chatbotController.sendMessage);
router.post('/insert-chat-message', chatbotController.insertChatMessage);
router.post('/:id/alert', chatbotController.addAlert);
router.put('/resolve/:id', chatbotController.resolveAll);
router.put('/get-help/:userId', chatbotController.getHelp);
router.put('/updateStatus/:userId', chatbotController.updateStatus);
router.put('/deactivateStatus/:userId', chatbotController.deactivate);

module.exports = router;
