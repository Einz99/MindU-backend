const express = require('express');
const router = express.Router();
const chatbotSettingsController = require('../controllers/chatbotSettingsController');


// ========== STUDENT ROUTES (only active FAQs) ==========
router.get('/active', chatbotSettingsController.getActiveFAQs);

router.get('/posted', chatbotSettingsController.getActiveTriggers);

// ========== ADMIN ROUTES (all FAQs) ==========
router.get('/admin/all', chatbotSettingsController.getAllFAQs);

router.get('/admin/all-triggers', chatbotSettingsController.getAllTriggers);

// ========== ADMIN CRUD ROUTES ==========
router.post('/admin/create', chatbotSettingsController.createFAQ);
router.put('/admin/update/:id', chatbotSettingsController.updateFAQ);
router.delete('/admin/delete/:id', chatbotSettingsController.deleteFAQ);
router.post('/admin/delete-multiple', chatbotSettingsController.deleteMultipleFAQs);

router.post('/admin/create-trigger', chatbotSettingsController.createTrigger);
router.put('/admin/update-trigger/:id', chatbotSettingsController.updateTrigger);
router.delete('/admin/trigger/delete-trigger/:id', chatbotSettingsController.deleteTrigger);
router.post('/admin/trigger/delete-multiple', chatbotSettingsController.deleteMultipleTriggers);

// ========== ADMIN TOGGLE ROUTES ==========
router.patch('/admin/toggle/:id', chatbotSettingsController.toggleSingle);
router.patch('/admin/toggle-bulk', chatbotSettingsController.toggleBulk);

module.exports = router;