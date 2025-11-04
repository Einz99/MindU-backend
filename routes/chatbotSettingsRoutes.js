const express = require('express');
const router = express.Router();
const chatbotSettingsController = require('../controllers/chatbotSettingsController');


// ========== STUDENT ROUTES (only active FAQs) ==========
router.get('/active', chatbotSettingsController.getActiveFAQs);

// ========== ADMIN ROUTES (all FAQs) ==========
router.get('/admin/all', chatbotSettingsController.getAllFAQs);

// ========== ADMIN CRUD ROUTES ==========
router.post('/admin/create', chatbotSettingsController.createFAQ);
router.put('/admin/update/:id', chatbotSettingsController.updateFAQ);
router.delete('/admin/delete/:id', chatbotSettingsController.deleteFAQ);
router.post('/admin/delete-multiple', chatbotSettingsController.deleteMultipleFAQs);

// ========== ADMIN TOGGLE ROUTES ==========
router.patch('/admin/toggle/:id', chatbotSettingsController.toggleSingle);
router.patch('/admin/toggle-bulk', chatbotSettingsController.toggleBulk);

module.exports = router;