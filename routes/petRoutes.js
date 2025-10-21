const express = require("express");
const router = express.Router();
const petController = require("../controllers/petController");

// Route to get pet by ID
router.get('/:id', petController.getPetByStudentId);
router.get('/:id/toy', petController.getToy);
router.get('/:petId/soap', petController.getSoap);
router.get('/:petId/accessories', petController.getAccessories);

// Route to insert a new pet
router.post('/', petController.insertPet);

router.put('/:id/food', petController.addFood);
router.put('/:id/foodeat', petController.eatFood);
router.put('/:id/soap', petController.addSoap);
router.put('/:id/soapuse', petController.useSoap);
router.put('/:id/buyToy', petController.addToy);
router.put('/:petId/buyAccessory', petController.buyAccessory);
router.put('/:petId/accessory', petController.updateAccessory);
router.put('/:id/useToy', petController.updateToy);

module.exports = router;
