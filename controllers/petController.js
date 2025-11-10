const petService = require("../services/petService");
const db = require('../db');

// Controller to get pet by student_id
exports.getPetByStudentId = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    
    console.log('[getPetByStudentId] Request started', {
      timestamp: new Date().toISOString(),
      student_id: id,
      ip: req.ip
    });
    
    const pets = await petService.getPetByStudentId(id);
    
    if (!pets || pets.length === 0) {
      console.warn('[getPetByStudentId] No pets found', {
        timestamp: new Date().toISOString(),
        student_id: id,
        shouldGoToAdoption: true,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(404).json({
        message: 'No pets found for this student',
        shouldGoToAdoption: true
      });
    }

    console.log('[getPetByStudentId] Request successful', {
      timestamp: new Date().toISOString(),
      student_id: id,
      petCount: pets.length,
      petId: pets[0].id,
      petType: pets[0].pet_type,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({
      pet: pets[0],
      shouldGoToAdoption: false
    });

  } catch (error) {
    console.error('[getPetByStudentId] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.params.id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.insertPet = async (req, res) => {
  const startTime = Date.now();
  try {
    const { student_id, pet_name, pet_type } = req.body;
    
    console.log('[insertPet] Request started', {
      timestamp: new Date().toISOString(),
      student_id,
      pet_name,
      pet_type,
      ip: req.ip
    });
    
    if (!student_id || !pet_name || !pet_type) {
      console.warn('[insertPet] Validation failed - missing fields', {
        timestamp: new Date().toISOString(),
        hasStudentId: !!student_id,
        hasPetName: !!pet_name,
        hasPetType: !!pet_type
      });
      
      return res.status(400).json({ message: "Missing required fields: student_id, pet_name, pet_type" });
    }

    const newPet = await petService.insertPet(student_id, pet_name, pet_type);
    
    console.log('[insertPet] Pet created', {
      timestamp: new Date().toISOString(),
      student_id,
      pet_id: newPet.id,
      pet_name,
      pet_type
    });

    await petService.insertDefaultToy(newPet.id);
    console.log('[insertPet] Default toy inserted', {
      timestamp: new Date().toISOString(),
      pet_id: newPet.id
    });

    await petService.insertDefaultSoap(newPet.id);
    console.log('[insertPet] Default soap inserted', {
      timestamp: new Date().toISOString(),
      pet_id: newPet.id
    });

    console.log('[insertPet] Request successful', {
      timestamp: new Date().toISOString(),
      student_id,
      pet_id: newPet.id,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(201).json(newPet);
  } catch (error) {
    console.error('[insertPet] Request failed', {
      timestamp: new Date().toISOString(),
      student_id: req.body.student_id,
      pet_name: req.body.pet_name,
      pet_type: req.body.pet_type,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.addFood = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;
  const { increments } = req.body;

  try {
    console.log('[addFood] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      increments,
      ip: req.ip
    });

    if (increments !== 1 && increments !== 5) {
      console.warn('[addFood] Validation failed - invalid increment', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        increments
      });
      
      return res.status(400).json({ message: "Invalid increment. Only 1 or 5 is allowed." });
    }

    const updatedPet = await petService.addFood(petId, increments);

    console.log('[addFood] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      increments,
      newFoodStack: updatedPet.food_stack,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(updatedPet);
  } catch (error) {
    console.error('[addFood] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      increments,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.eatFood = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;

  try {
    console.log('[eatFood] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      ip: req.ip
    });

    const updatedPet = await petService.eatFood(petId);

    console.log('[eatFood] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      newHunger: updatedPet.hunger,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(updatedPet);
  } catch (error) {
    console.error('[eatFood] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getSoap = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.petId;

  try {
    console.log('[getSoap] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      ip: req.ip
    });

    const soapData = await petService.getSoap(petId);

    if (!soapData || soapData.length === 0) {
      console.log('[getSoap] No soap found', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.json([]);
    }

    console.log('[getSoap] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      soapCount: soapData.length,
      soapTypes: soapData.map(s => s.soap_type),
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(soapData);
  } catch (error) {
    console.error('[getSoap] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.addSoap = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;
  const { soap_type } = req.body;

  try {
    console.log('[addSoap] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      soap_type,
      ip: req.ip
    });

    if (!soap_type) {
      console.warn('[addSoap] Validation failed - missing soap_type', {
        timestamp: new Date().toISOString(),
        pet_id: petId
      });
      
      return res.status(400).json({ message: "Soap type is required." });
    }

    const updatedSoap = await petService.addSoap(petId, soap_type);

    console.log('[addSoap] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      soap_type,
      newQuantity: updatedSoap.quantity,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(updatedSoap);
  } catch (error) {
    console.error('[addSoap] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      soap_type,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.useSoap = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;

  try {
    console.log('[useSoap] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      ip: req.ip
    });

    const updatedData = await petService.useSoap(petId);

    console.log('[useSoap] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      newHygiene: updatedData.hygiene,
      coinsDeducted: updatedData.coins_deducted,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(updatedData);
  } catch (error) {
    console.error('[useSoap] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.addToy = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;
  const { toy_type } = req.body;

  try {
    console.log('[addToy] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      toy_type,
      ip: req.ip
    });

    if (!toy_type) {
      console.warn('[addToy] Validation failed - missing toy_type', {
        timestamp: new Date().toISOString(),
        pet_id: petId
      });
      
      return res.status(400).json({ message: "Missing required field: toy_type" });
    }

    const updatedToy = await petService.addToy(petId, toy_type);

    console.log('[addToy] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      toy_type,
      coinsDeducted: updatedToy.coins_deducted,
      remainingCoins: updatedToy.remaining_coins,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(updatedToy);
  } catch (error) {
    console.error('[addToy] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      toy_type,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getToy = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;

  try {
    console.log('[getToy] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      ip: req.ip
    });

    const toy = await petService.getToy(petId);

    console.log('[getToy] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      toy_type: toy.toy_type,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(toy);
  } catch (error) {
    console.error('[getToy] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateToy = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;
  const { toy_type } = req.body;

  try {
    console.log('[updateToy] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      toy_type,
      ip: req.ip
    });

    if (!toy_type) {
      console.warn('[updateToy] Validation failed - missing toy_type', {
        timestamp: new Date().toISOString(),
        pet_id: petId
      });
      
      return res.status(400).json({ message: "Missing required field: toy_type" });
    }

    const updatedToy = await petService.updateToy(petId, toy_type);

    console.log('[updateToy] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      toy_type,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(updatedToy);
  } catch (error) {
    console.error('[updateToy] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      toy_type,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAccessories = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.petId;

  try {
    console.log('[getAccessories] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      ip: req.ip
    });

    if (!petId) {
      console.warn('[getAccessories] Validation failed - missing pet_id', {
        timestamp: new Date().toISOString()
      });
      
      return res.status(400).json({ message: "Missing required field: pet_id" });
    }

    const accessories = await petService.getAccessories(petId);

    if (accessories.length === 0) {
      console.log('[getAccessories] No accessories found', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        duration: `${Date.now() - startTime}ms`
      });
      
      return res.status(200).json({ message: "No accessories found" });
    }

    console.log('[getAccessories] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      accessoryCount: accessories.length,
      categories: [...new Set(accessories.map(a => a.accessory_category))],
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(accessories);
  } catch (error) {
    console.error('[getAccessories] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.buyAccessory = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.petId;
  const { accessory_id } = req.body;

  try {
    console.log('[buyAccessory] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      accessory_id,
      ip: req.ip
    });

    if (!petId || !accessory_id) {
      console.warn('[buyAccessory] Validation failed - missing fields', {
        timestamp: new Date().toISOString(),
        hasPetId: !!petId,
        hasAccessoryId: !!accessory_id
      });
      
      return res.status(400).json({ message: "Missing required fields: petId or accessory_id" });
    }

    let accessoryCategory = '';
    let accessoryPrice = 0;

    if (accessory_id >= 1 && accessory_id <= 4) {
      accessoryCategory = 'hat';
      accessoryPrice = 40;
    } else if (accessory_id >= 5 && accessory_id <= 8) {
      accessoryCategory = 'glasses';
      accessoryPrice = 35;
    } else if (accessory_id >= 9 && accessory_id <= 12) {
      accessoryCategory = 'collar';
      accessoryPrice = 30;
    } else {
      console.warn('[buyAccessory] Invalid accessory_id', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        accessory_id
      });
      
      return res.status(400).json({ message: "Invalid accessory_id" });
    }

    const petQuery = 'SELECT coins FROM pets WHERE id = ?';
    const [petRows] = await db.query(petQuery, [petId]);

    if (petRows.length === 0) {
      console.warn('[buyAccessory] Pet not found', {
        timestamp: new Date().toISOString(),
        pet_id: petId
      });
      
      return res.status(404).json({ message: "Pet not found" });
    }

    const petCoins = petRows[0].coins;

    if (petCoins < accessoryPrice) {
      console.warn('[buyAccessory] Insufficient coins', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        currentCoins: petCoins,
        requiredCoins: accessoryPrice,
        deficit: accessoryPrice - petCoins
      });
      
      return res.status(400).json({ message: "Not enough coins to buy this accessory" });
    }

    const newCoins = petCoins - accessoryPrice;
    const updatePetQuery = 'UPDATE pets SET coins = ? WHERE id = ?';
    await db.query(updatePetQuery, [newCoins, petId]);

    const insertAccessoryQuery = `
      INSERT INTO pet_accessories (pet_id, accessory_id, accessory_category)
      VALUES (?, ?, ?)
    `;
    await db.query(insertAccessoryQuery, [petId, accessory_id, accessoryCategory]);

    console.log('[buyAccessory] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      accessory_id,
      accessory_category: accessoryCategory,
      price: accessoryPrice,
      previousCoins: petCoins,
      newCoins,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ message: `Accessory ${accessory_id} bought successfully!` });

  } catch (error) {
    console.error('[buyAccessory] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      accessory_id,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateAccessory = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.petId;
  const { accessory_id, accessory_category } = req.body;

  try {
    console.log('[updateAccessory] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      accessory_id,
      accessory_category,
      ip: req.ip
    });

    if (accessory_id === undefined || !accessory_category) {
      console.warn('[updateAccessory] Validation failed - missing fields', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        hasAccessoryId: accessory_id !== undefined,
        hasCategory: !!accessory_category
      });
      
      return res.status(400).json({ message: "Missing required fields: accessory_id or accessory_category" });
    }

    let updateField = '';
    let newValue = null;

    if (accessory_id === 0) {
      newValue = null;
      if (accessory_category === 'hat') {
        updateField = 'pet_head';
      } else if (accessory_category === 'glasses') {
        updateField = 'pet_eyes';
      } else if (accessory_category === 'collar') {
        updateField = 'pet_neck';
      } else {
        console.warn('[updateAccessory] Invalid category for removal', {
          timestamp: new Date().toISOString(),
          pet_id: petId,
          accessory_category
        });
        
        return res.status(400).json({ message: "Invalid accessory_category" });
      }
    } else {
      if (accessory_category === 'hat' && accessory_id >= 1 && accessory_id <= 4) {
        updateField = 'pet_head';
        newValue = accessory_id;
      } else if (accessory_category === 'glasses' && accessory_id >= 5 && accessory_id <= 8) {
        updateField = 'pet_eyes';
        newValue = accessory_id;
      } else if (accessory_category === 'collar' && accessory_id >= 9 && accessory_id <= 12) {
        updateField = 'pet_neck';
        newValue = accessory_id;
      } else {
        console.warn('[updateAccessory] Invalid accessory_id/category combination', {
          timestamp: new Date().toISOString(),
          pet_id: petId,
          accessory_id,
          accessory_category
        });
        
        return res.status(400).json({ message: "Invalid accessory_id or accessory_category" });
      }
    }

    const query = `UPDATE pets SET ${updateField} = ? WHERE id = ?`;
    await db.query(query, [newValue, petId]);

    console.log('[updateAccessory] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      field: updateField,
      value: newValue,
      action: newValue === null ? 'removed' : 'equipped',
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({ 
      message: `Accessory updated successfully`,
      pet_id: petId,
      field: updateField,
      value: newValue
    });
  } catch (error) {
    console.error('[updateAccessory] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      accessory_id,
      accessory_category,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updatePlay = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;
  const { increment, result } = req.body;

  try {
    console.log('[updatePlay] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      increment,
      result,
      ip: req.ip
    });

    if (isNaN(increment) || increment === null || increment === undefined) {
      console.warn('[updatePlay] Validation failed - invalid increment', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        increment
      });
      
      return res.status(400).json({ message: "Invalid increment value" });
    }

    const selectQuery = `
      SELECT playfulness, hunger, sleep, hygiene, coins
      FROM pets
      WHERE id = ?;
    `;
    const [rows] = await db.query(selectQuery, [petId]);

    if (rows.length === 0) {
      console.warn('[updatePlay] Pet not found', {
        timestamp: new Date().toISOString(),
        pet_id: petId
      });
      
      return res.status(404).json({ message: "Pet not found" });
    }

    let { playfulness, hunger, sleep, hygiene, coins } = rows[0];

    const initialStats = { playfulness, hunger, sleep, hygiene, coins };

    playfulness = playfulness || 0;
    hunger = hunger || 0;
    sleep = sleep || 0;
    hygiene = hygiene || 0;
    coins = coins || 0;

    playfulness += increment;

    let hungerDecrease = 0;
    let sleepDecrease = 0;
    let hygieneDecrease = 0;
    let coinIncrease = 0;

    switch(result) {
      case 'perfect':
        hungerDecrease = 5;
        sleepDecrease = 3;
        hygieneDecrease = 2;
        coinIncrease = 5;
        break;
      case 'good':
        hungerDecrease = 3;
        sleepDecrease = 2;
        hygieneDecrease = 1;
        coinIncrease = 3;
        break;
      case 'miss':
        hungerDecrease = 1;
        sleepDecrease = 1;
        hygieneDecrease = 0;
        coinIncrease = 1;
        break;
    }

    hunger -= hungerDecrease;
    sleep -= sleepDecrease;
    hygiene -= hygieneDecrease;
    coins += coinIncrease;

    playfulness = Math.max(0, Math.min(100, playfulness));
    hunger = Math.max(0, Math.min(100, hunger));
    sleep = Math.max(0, Math.min(100, sleep));
    hygiene = Math.max(0, Math.min(100, hygiene));
    coins = Math.max(0, coins);

    const updateQuery = `
      UPDATE pets
      SET playfulness = ?, hunger = ?, sleep = ?, hygiene = ?, coins = ?
      WHERE id = ?;
    `;

    await db.query(updateQuery, [playfulness, hunger, sleep, hygiene, coins, petId]);

    console.log('[updatePlay] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      result,
      statChanges: {
        playfulness: { before: initialStats.playfulness, after: playfulness, change: playfulness - initialStats.playfulness },
        hunger: { before: initialStats.hunger, after: hunger, change: hunger - initialStats.hunger },
        sleep: { before: initialStats.sleep, after: sleep, change: sleep - initialStats.sleep },
        hygiene: { before: initialStats.hygiene, after: hygiene, change: hygiene - initialStats.hygiene },
        coins: { before: initialStats.coins, after: coins, change: coins - initialStats.coins }
      },
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json({
      playfulness,
      hunger,
      sleep,
      hygiene,
      coins
    });

  } catch (error) {
    console.error('[updatePlay] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      increment,
      result,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.setActiveSoap = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;
  const { soap_type } = req.body;

  try {
    console.log('[setActiveSoap] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      soap_type,
      ip: req.ip
    });

    if (!soap_type) {
      console.warn('[setActiveSoap] Validation failed - missing soap_type', {
        timestamp: new Date().toISOString(),
        pet_id: petId
      });
      
      return res.status(400).json({ message: "Missing required field: soap_type" });
    }

    const result = await petService.setActiveSoap(petId, soap_type);

    console.log('[setActiveSoap] Request successful', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      soap_type,
      duration: `${Date.now() - startTime}ms`
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[setActiveSoap] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      soap_type,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.dailyReward = async (req, res) => {
  const startTime = Date.now();
  const petId = req.params.id;
  const { streak } = req.body;

  try {
    console.log('[dailyReward] Request started', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      streak,
      ip: req.ip
    });

    if (!streak || streak < 1 || streak > 7) {
      console.warn('[dailyReward] Validation failed - invalid streak', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        streak,
        validRange: '1-7'
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid streak value. Must be between 1-7' 
      });
    }

    const result = await petService.claimDailyReward(petId, streak);

    if (result.success) {
      console.log('[dailyReward] Reward claimed successfully', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        streak,
        reward_type: result.reward_type,
        reward_amount: result.reward_amount,
        new_coins: result.coins,
        new_food_stack: result.food_stack,
        duration: `${Date.now() - startTime}ms`
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          coins: result.coins,
          food_stack: result.food_stack,
          reward_type: result.reward_type,
          reward_amount: result.reward_amount
        }
      });
    } else {
      console.warn('[dailyReward] Reward claim failed', {
        timestamp: new Date().toISOString(),
        pet_id: petId,
        streak,
        reason: result.message,
        duration: `${Date.now() - startTime}ms`
      });

      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('[dailyReward] Request failed', {
      timestamp: new Date().toISOString(),
      pet_id: petId,
      streak,
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while claiming daily reward',
      error: error.message 
    });
  }
};