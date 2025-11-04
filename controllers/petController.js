const petService = require("../services/petService");
const db = require('../db');

// Controller to get pet by student_id
exports.getPetByStudentId = async (req, res) => {
  try {
    const { id } = req.params; // Get the student_id from the URL params
    console.log(id);
    const pets = await petService.getPetByStudentId(id); // Call service to get pets by student_id
    
    if (!pets || pets.length === 0) {
      // No pets found for this student, check if they should go to Adoption Scene
      return res.status(404).json({
        message: 'No pets found for this student',
        shouldGoToAdoption: true  // Decide whether to go to adoption scene
      });
    }

    // If pets are found, return the pet data
    return res.status(200).json({
      pet: pets[0],  // Assuming the student only has one pet, return the first pet
      shouldGoToAdoption: false  // No need to go to adoption scene, return to pet scene
    });

  } catch (error) {
    console.error("Error getting pet:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.insertPet = async (req, res) => {
  console.log("Inserting Pet");

  try {
    const { student_id, pet_name, pet_type } = req.body; // Get data from request body
    
    // Validate input
    if (!student_id || !pet_name || !pet_type) {
      return res.status(400).json({ message: "Missing required fields: student_id, pet_name, pet_type" });
    }

    // Call service to insert the pet and get the newly inserted pet
    const newPet = await petService.insertPet(student_id, pet_name, pet_type); 

    // Automatically insert default toy for the newly created pet
    await petService.insertDefaultToy(newPet.id);

    // Automatically insert default soap (soap_1) with quantity 3 for the newly created pet
    await petService.insertDefaultSoap(newPet.id);

    // Return the new pet data
    return res.status(201).json(newPet); // Return the new pet data
  } catch (error) {
    console.error("Error inserting pet:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.addFood = async (req, res) => {
  const petId = req.params.id;  // Pet ID from the URL parameter
  const { increments } = req.body;  // Food increment value (1 or 5)

  try {
    // Validate the increment value
    if (increments !== 1 && increments !== 5) {
      return res.status(400).json({ message: "Invalid increment. Only 1 or 5 is allowed." });
    }

    // Call the service to update the pet's food quantity
    const updatedPet = await petService.addFood(petId, increments);

    // Return the updated pet data
    return res.status(200).json(updatedPet);
  } catch (error) {
    console.error("Error adding food:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.eatFood = async (req, res) => {
  const petId = req.params.id; 

  try {
    // Call the service to decrease the pet's food quantity
    const updatedPet = await petService.eatFood(petId);

    // Return the updated pet data
    return res.status(200).json(updatedPet);
  } catch (error) {
    console.error("Error feeding pet:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller method to get soap type and quantity for a specific pet
exports.getSoap = async (req, res) => {
  const petId = req.params.petId; // Pet ID from the URL parameter

  try {
    // Call service to get soap type and quantity for the pet
    const soapData = await petService.getSoap(petId);

    // If no soap data exists, return an empty array
    if (!soapData || soapData.length === 0) {
      return res.json([]); // Return an empty array if no soap found
    }

    // Return the list of soap types and quantities
    return res.status(200).json(soapData);
  } catch (error) {
    console.error("Error fetching soap data:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller method to add bath soap
exports.addSoap = async (req, res) => {
  const petId = req.params.id;  // Pet ID from the URL parameter
  const { soap_type } = req.body;  // Soap type from the request body

  try {
    // Validate input
    if (!soap_type) {
      return res.status(400).json({ message: "Soap type is required." });
    }

    // Call the service to handle the soap logic
    const updatedSoap = await petService.addSoap(petId, soap_type);

    // Return the updated soap details
    return res.status(200).json(updatedSoap);
  } catch (error) {
    console.error("Error adding soap:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.useSoap = async (req, res) => {
  const petId = req.params.id;

  try {
    // Call the service to update hygiene and reduce coins
    const updatedData = await petService.useSoap(petId);

    // Return the updated data
    return res.status(200).json(updatedData);
  } catch (error) {
    console.error("Error using soap:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller method to insert a toy for a pet
exports.addToy = async (req, res) => {
  const petId = req.params.id;  // Pet ID from the URL parameter
  const { toy_type } = req.body;  // Toy type from the request body

  try {
    // Validate input
    if (!toy_type) {
      return res.status(400).json({ message: "Missing required field: toy_type" });
    }

    // Call the service to add the toy to the pet and deduct coins
    const updatedToy = await petService.addToy(petId, toy_type);

    // Return the updated toy and coin data
    return res.status(200).json(updatedToy);
  } catch (error) {
    console.error("Error adding toy:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller method to get the toy for a specific pet
exports.getToy = async (req, res) => {
  const petId = req.params.id;  // Pet ID from the URL parameter
  console.log("accessing get toy");
  try {
    // Call the service to get the toy's details
    const toy = await petService.getToy(petId);

    // Return the toy data
    return res.status(200).json(toy);
  } catch (error) {
    console.error("Error retrieving toy:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller method to update the toy for a specific pet
exports.updateToy = async (req, res) => {
  const petId = req.params.id;  // Pet ID from the URL parameter
  const { toy_type } = req.body;  // Toy type from the request body

  try {
    // Validate input
    if (!toy_type) {
      return res.status(400).json({ message: "Missing required field: toy_type" });
    }

    // Call the service to update the toy for the pet
    const updatedToy = await petService.updateToy(petId, toy_type);

    // Return the updated toy data
    return res.status(200).json(updatedToy);
  } catch (error) {
    console.error("Error updating toy:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getAccessories = async (req, res) => {
  const petId = req.params.petId;

  try {
    if (!petId) {
      return res.status(400).json({ message: "Missing required field: pet_id" });
    }

    const accessories = await petService.getAccessories(petId);

    if (accessories.length === 0) {
      return res.status(200).json({ message: "No accessories found" });
    } else {
      return res.status(200).json(accessories);
    }
  } catch (error) {
    console.error("Error fetching accessories:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.buyAccessory = async (req, res) => {
  const petId = req.params.petId;
  const { accessory_id } = req.body;

  // Validate inputs
  if (!petId || !accessory_id) {
    return res.status(400).json({ message: "Missing required fields: petId or accessory_id" });
  }

  // Determine the accessory category and price based on accessory_id
  let accessoryCategory = '';
  let accessoryPrice = 0;

  if (accessory_id >= 1 && accessory_id <= 4) {
    accessoryCategory = 'hat';
    accessoryPrice = 40; // Hats cost 40 coins
  } else if (accessory_id >= 5 && accessory_id <= 8) {
    accessoryCategory = 'glasses';
    accessoryPrice = 35; // Glasses cost 35 coins
  } else if (accessory_id >= 9 && accessory_id <= 12) {
    accessoryCategory = 'collar';
    accessoryPrice = 30; // Collars cost 30 coins
  } else {
    return res.status(400).json({ message: "Invalid accessory_id" });
  }

  try {
    // Step 1: Check if the pet has enough coins
    const petQuery = 'SELECT coins FROM pets WHERE id = ?';
    const [petRows] = await db.query(petQuery, [petId]);

    if (petRows.length === 0) {
      return res.status(404).json({ message: "Pet not found" });
    }

    const petCoins = petRows[0].coins;

    if (petCoins < accessoryPrice) {
      return res.status(400).json({ message: "Not enough coins to buy this accessory" });
    }

    // Step 2: Deduct coins from the pet
    const newCoins = petCoins - accessoryPrice;
    const updatePetQuery = 'UPDATE pets SET coins = ? WHERE id = ?';
    await db.query(updatePetQuery, [newCoins, petId]);

    // Step 3: Insert the accessory into the pet_accessories table
    const insertAccessoryQuery = `
      INSERT INTO pet_accessories (pet_id, accessory_id, accessory_category)
      VALUES (?, ?, ?)
    `;
    await db.query(insertAccessoryQuery, [petId, accessory_id, accessoryCategory]);

    // Return a success response
    return res.status(200).json({ message: `Accessory ${accessory_id} bought successfully!` });

  } catch (error) {
    console.error("Error buying accessory:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateAccessory = async (req, res) => {
  const petId = req.params.petId;
  const { accessory_id, accessory_category } = req.body;
  console.log("accessing update of accessories");
  
  // Validate input
  if (accessory_id === undefined || !accessory_category) {
    return res.status(400).json({ message: "Missing required fields: accessory_id or accessory_category" });
  }

  let updateField = '';
  let newValue = null;

  // Determine the field to update based on accessory_category
  if (accessory_id === 0) {
    newValue = null; // Set to null if accessory_id is 0
    if (accessory_category === 'hat') {
      updateField = 'pet_head';
    } else if (accessory_category === 'glasses') {
      updateField = 'pet_eyes';
    } else if (accessory_category === 'collar') {
      updateField = 'pet_neck';
    } else {
      return res.status(400).json({ message: "Invalid accessory_category" });
    }
  } else {
    // Validate accessory_id ranges
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
      return res.status(400).json({ message: "Invalid accessory_id or accessory_category" });
    }
  }

  // Prepare SQL query to update the accessory
  const query = `UPDATE pets SET ${updateField} = ? WHERE id = ?`;

  try {
    // Execute the update query
    await db.query(query, [newValue, petId]);

    // Return success response
    return res.status(200).json({ 
      message: `Accessory updated successfully`,
      pet_id: petId,
      field: updateField,
      value: newValue
    });
  } catch (error) {
    console.error("Error updating accessory:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updatePlay = async (req, res) => {
  try {
    const petId = req.params.id; // ← FIX: Use req.params.id (from route /:id)
    const { increment, result } = req.body;

    // ADD THIS DEBUG LOGGING
    console.log('Received params:', { petId, increment, result });
    console.log('Types:', { 
      petId: typeof petId, 
      increment: typeof increment, 
      result: typeof result 
    });

    if (isNaN(increment) || increment === null || increment === undefined) {
      return res.status(400).json({ message: "Invalid increment value" }); // ← FIX: return response
    }

    // Fetch current stats
    const selectQuery = `
      SELECT playfulness, hunger, sleep, hygiene, coins
      FROM pets
      WHERE id = ?;
    `;
    const [rows] = await db.query(selectQuery, [petId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Pet not found" }); // ← FIX: return response
    }

    let { playfulness, hunger, sleep, hygiene, coins } = rows[0];

    // Initialize to 0 if null
    playfulness = playfulness || 0;
    hunger = hunger || 0;
    sleep = sleep || 0;
    hygiene = hygiene || 0;
    coins = coins || 0;

    // Add playfulness increment
    playfulness += increment;

    // Determine stat changes based on result
    let hungerDecrease = 0;
    let sleepDecrease = 0;
    let hygieneDecrease = 0;
    let coinIncrease = 0;

    switch(result) {
      case 'perfect': // Perfect Catch (GREEN)
        hungerDecrease = 5;
        sleepDecrease = 3;
        hygieneDecrease = 2;
        coinIncrease = 5;
        break;
      case 'good': // Imperfect Catch (BLUE)
        hungerDecrease = 3;
        sleepDecrease = 2;
        hygieneDecrease = 1;
        coinIncrease = 3;
        break;
      case 'miss': // Missed Catch
        hungerDecrease = 1;
        sleepDecrease = 1;
        hygieneDecrease = 0;
        coinIncrease = 1;
        break;
    }

    // Apply stat changes
    hunger -= hungerDecrease;
    sleep -= sleepDecrease;
    hygiene -= hygieneDecrease;
    coins += coinIncrease;

    // Clamp all values between 0 and 100
    playfulness = Math.max(0, Math.min(100, playfulness));
    hunger = Math.max(0, Math.min(100, hunger));
    sleep = Math.max(0, Math.min(100, sleep));
    hygiene = Math.max(0, Math.min(100, hygiene));
    // Coins can go above 100
    coins = Math.max(0, coins);

    // Update database
    const updateQuery = `
      UPDATE pets
      SET playfulness = ?, hunger = ?, sleep = ?, hygiene = ?, coins = ?
      WHERE id = ?;
    `;

    await db.query(updateQuery, [playfulness, hunger, sleep, hygiene, coins, petId]);

    // ✅ FIX: Send response to Unity
    return res.status(200).json({
      playfulness,
      hunger,
      sleep,
      hygiene,
      coins
    });

  } catch (error) {
    console.error("Error setting stats:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

exports.setActiveSoap = async (req, res) => {
  const petId = req.params.id;
  const { soap_type } = req.body;

  try {
    // Validate input
    if (!soap_type) {
      return res.status(400).json({ message: "Missing required field: soap_type" });
    }

    // Call the service to set the active soap
    const result = await petService.setActiveSoap(petId, soap_type);

    // Return success response
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error setting active soap:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.dailyReward = async (req, res) => {
    try {
        const petId = req.params.id;
        const { streak } = req.body; // Receive streak from Unity (1-7)

        if (!streak || streak < 1 || streak > 7) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid streak value. Must be between 1-7' 
            });
        }

        const result = await petService.claimDailyReward(petId, streak);

        if (result.success) {
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
            res.status(404).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Error claiming daily reward:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error while claiming daily reward',
            error: error.message 
        });
    }
};