const express = require("express");
const router = express.Router();
const petController = require("../controllers/petController");

// Route to get pet by ID
router.get('/:id', petController.getPetByStudentId);

// Route to insert a new pet
router.post('/', petController.insertPet);

module.exports = router;
