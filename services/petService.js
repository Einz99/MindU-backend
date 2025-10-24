const db = require("../db");

// Function to get pets by student_id
exports.getPetByStudentId = async (student_id) => {
  const [rows] = await db.query(
    `SELECT * FROM pets WHERE student_id = ?`,
    [student_id]
  );
  return rows;  // Return all pets associated with the student_id
};

// Function to insert a new pet
exports.insertPet = async (studentId, petName, petType) => {
  const query = `
    INSERT INTO pets (student_id, pet_name, pet_type)
    VALUES (?, ?, ?)
  `;
  
  const [result] = await db.query(query, [studentId, petName, petType]);

  // Return the inserted pet with its ID and other details
  return {
    id: result.insertId,
    student_id: studentId,
    pet_name: petName,
    pet_type: petType
  };
};

// Function to insert the default toy (toy_1) for the newly created pet
exports.insertDefaultToy = async (petId) => {
  const query = `
    INSERT INTO pet_toys (pet_id, toy_type, is_active)
    VALUES (?, 'toy_1', TRUE)
  `;

  await db.query(query, [petId]);
};

exports.insertDefaultSoap = async (petId) => {
  const query = `
    INSERT INTO pet_bath_soap (pet_id, soap_type, quantity, is_in_use)
    VALUES (?, 'soap_1', 3, TRUE)
  `;

  await db.query(query, [petId]);
};

exports.addFood = async (petId, increments) => {
  // Query to fetch the current food quantity and coins
  const [currentPet] = await db.query(`
    SELECT food_stack, coins FROM pets WHERE id = ?
  `, [petId]);

  // Check if pet exists
  if (!currentPet || currentPet.length === 0) {
    throw new Error('Pet not found');
  }

  // Get the current food stack and coins, making sure they're valid numbers
  let currentFoodStack = currentPet[0].food_stack || 0;  // Default to 0 if it's null
  let currentCoins = currentPet[0].coins || 0;  // Default to 0 if it's null

  console.log("Current Food Stack: ", currentFoodStack);
  console.log("Current Coins: ", currentCoins);
  console.log("Increment: ", increments);

  // Validate the increment value
  if (increments !== 1 && increments !== 5) {
    throw new Error('Invalid increment for food. Only 1 or 5 is allowed.');
  }

  // Calculate the new food quantity
  const newFoodQuantity = currentFoodStack + increments;

  // Deduct coins based on the increment value
  let coinDeduction = 0;
  if (increments === 1) {
    coinDeduction = 10; // Deduct 10 coins for 1 food
  } else if (increments === 5) {
    coinDeduction = 35; // Deduct 35 coins for 5 food
  }

  // Calculate the new coin balance
  const newCoins = currentCoins - coinDeduction;

  // Check if the new values are valid numbers (to prevent NaN)
  if (isNaN(newFoodQuantity) || isNaN(newCoins)) {
    throw new Error("Invalid calculation for food quantity or coins.");
  }

  // Query to update the pet's food quantity and coins
  const query = `
    UPDATE pets
    SET food_stack = ?, coins = ?
    WHERE id = ?
  `;
  
  await db.query(query, [newFoodQuantity, newCoins, petId]);

  // Return the updated pet data
  return {
    pet_id: petId,
    new_food_quantity: newFoodQuantity,
    new_coins: newCoins
  };
};

// Service method to decrease food quantity when pet is fed
exports.eatFood = async (petId) => {
  // Query to fetch the current food quantity and hunger
  const [currentPet] = await db.query(`
    SELECT food_stack, hunger FROM pets WHERE id = ?
  `, [petId]);

  if (!currentPet || currentPet.length === 0) {
    throw new Error('Pet not found');
  }

  const petData = currentPet[0]; // Access the first pet data object

  // Ensure food quantity is greater than 0 before feeding
  if (petData.food_stack <= 0) {
    throw new Error('Pet does not have enough food');
  }

  // Calculate the new food quantity (decrement by 1)
  const newFoodQuantity = petData.food_stack - 1;

  // Calculate new hunger value
  let newHungerQuantity = petData.hunger + 30; // Increase hunger by 30

  // Ensure that hunger doesn't exceed 100
  if (newHungerQuantity >= 100) {
    newHungerQuantity = 100; // Cap hunger at 100
  }

  // Ensure hunger doesn't fall below 0
  if (newHungerQuantity < 0) {
    newHungerQuantity = 0; // If hunger was somehow negative, cap it at 0
  }

  // Query to update the pet's food quantity and hunger
  const query = `
    UPDATE pets
    SET food_stack = ?, hunger = ?
    WHERE id = ?
  `;
  
  await db.query(query, [newFoodQuantity, newHungerQuantity, petId]);

  // Return the updated pet data
  return {
    pet_id: petId,
    new_food_quantity: newFoodQuantity,
    new_hunger_quantity: newHungerQuantity
  };
};

exports.getSoap = async (petId) => {
  try {
    const [soapData] = await db.query(`
      SELECT soap_type, quantity 
      FROM pet_bath_soap 
      WHERE pet_id = ?
    `, [petId]);

    if (soapData.length === 0) {
      return null; // No soap data found
    }

    return soapData; // Return all soap data
  } catch (error) {
    console.error("Error getting soap data:", error);
    throw new Error('Unable to fetch soap data');
  }
};

// Service method to add or update soap and update coins
exports.addSoap = async (petId, soapType) => {
  // Determine the coin deduction based on the soap type
  let coinDeduction = 0;
  switch (soapType) {
    case 'soap_1':
      coinDeduction = 5; // Soap 1 costs 5 coins
      break;
    case 'soap_2':
      coinDeduction = 10; // Soap 2 costs 10 coins
      break;
    case 'soap_3':
      coinDeduction = 15; // Soap 3 costs 15 coins
      break;
    case 'soap_4':
      coinDeduction = 20; // Soap 4 costs 20 coins
      break;
    default:
      throw new Error('Invalid soap type.');
  }

  const [existingSoap] = await db.query(`
    SELECT * FROM pet_bath_soap WHERE pet_id = ? AND soap_type = ?
  `, [petId, soapType]);

  // Get the current pet data
  const [currentPet] = await db.query(`
    SELECT coins FROM pets WHERE id = ?
  `, [petId]);

  // Check if pet exists
  if (!currentPet) {
    throw new Error('Pet not found');
  }

  const newCoins = currentPet[0].coins - coinDeduction;

  // If the soap type already exists for the pet, update it
  if (existingSoap.length > 0) {
    // Safely get the existing quantity and add 3 to it, defaulting to 0 if not found
    const existingQuantity = existingSoap[0].quantity || 0; // Ensure it's a valid number
    const newQuantity = existingQuantity + 3;  // Add 3 to the existing quantity
    
    // Update the soap's quantity and set it as active if not already
    const query = `
      UPDATE pet_bath_soap
      SET quantity = ?, is_in_use = TRUE
      WHERE pet_id = ? AND soap_type = ?
    `;
    
    await db.query(query, [newQuantity, petId, soapType]);

    // Query to update coins
    await db.query(`
      UPDATE pets
      SET coins = ?
      WHERE id = ?
    `, [newCoins, petId]);

    // Return updated soap and coin data
    return {
      pet_id: petId,
      soap_type: soapType,
      new_quantity: newQuantity,
      new_coins: newCoins,
      is_in_use: true
    };
  } else {
    // If the soap type doesn't exist for the pet, create a new entry
    const query = `
      INSERT INTO pet_bath_soap (pet_id, soap_type, quantity, is_in_use)
      VALUES (?, ?, 3, TRUE)  -- Add 3 as the initial quantity when the soap is first bought
    `;
    
    await db.query(query, [petId, soapType]);

    // Query to update coins
    await db.query(`
      UPDATE pets
      SET coins = ?
      WHERE id = ?
    `, [newCoins, petId]);

    // Return the newly added soap and coin data
    return {
      pet_id: petId,
      soap_type: soapType,
      new_quantity: 3,  // Set initial quantity to 3
      new_coins: newCoins,
      is_in_use: true
    };
  }
};

// Service method to add a toy and deduct coins
exports.addToy = async (petId, toyType) => {
  // Check if the pet exists
  const [currentPet] = await db.query(`
    SELECT coins FROM pets WHERE id = ?
  `, [petId]);

  if (!currentPet || currentPet.length === 0) {
    throw new Error('Pet not found');
  }

  // Deduct coins based on the toy type
  let coinDeduction = 0;
  switch (toyType) {
    case 'toy_2':
      coinDeduction = 20; // Toy 2 costs 20 coins
      break;
    case 'toy_3':
      coinDeduction = 25; // Toy 3 costs 25 coins
      break;
    case 'toy_4':
      coinDeduction = 30; // Toy 4 costs 30 coins
      break;
    case 'toy_5':
      coinDeduction = 35; // Toy 5 costs 35 coins
      break;
    case 'toy_6':
      coinDeduction = 40; // Toy 6 costs 40 coins
      break;
    default:
      throw new Error('Invalid toy type.');
  }

  const newCoins = currentPet[0].coins - coinDeduction;

  // Ensure the pet has enough coins
  if (newCoins < 0) {
    throw new Error('Not enough coins to buy the toy');
  }

  // Update the pet's coins
  const updateCoinsQuery = `
    UPDATE pets
    SET coins = ?
    WHERE id = ?
  `;
  
  await db.query(updateCoinsQuery, [newCoins, petId]);

  // Insert the new toy and set it as active
  const insertToyQuery = `
    INSERT INTO pet_toys (pet_id, toy_type)
    VALUES (?, ?)
  `;
  await db.query(insertToyQuery, [petId, toyType]);

  // Return the updated toy and coin data
  return {
    pet_id: petId,
    toy_type: toyType,
    new_coins: newCoins,
  };
};

// Service method to get the toy for a specific pet
exports.getToy = async (petId) => {
  // Query to get the toy's details for the specific pet
  const [toy] = await db.query(`
    SELECT * FROM pet_toys WHERE pet_id = ?
  `, [petId]);

  if (!toy || toy.length === 0) {
    throw new Error('Toy not found for the given pet');
  }

  // Return the toy details
  return toy;  // Return the first result (since pet_id and toy_type are unique for each pet)
};

// Service method to update the toy for a specific pet
exports.updateToy = async (petId, toyType) => {
  // Deactivate any active toy for this pet
  const deactivateQuery = `
    UPDATE pet_toys
    SET is_active = FALSE
    WHERE pet_id = ? AND is_active = TRUE
  `;
  await db.query(deactivateQuery, [petId]);

  // Activate the specified toy for the pet
  const activateQuery = `
    INSERT INTO pet_toys (pet_id, toy_type, is_active)
    VALUES (?, ?, TRUE)
    ON DUPLICATE KEY UPDATE is_active = TRUE
  `;
  await db.query(activateQuery, [petId, toyType]);

  // Return the updated toy data
  return {
    pet_id: petId,
    toy_type: toyType,
    is_active: true
  };
};

exports.getAccessories = async (petId) => {
  const query = `
    SELECT * FROM pet_accessories
    WHERE pet_id = ?
  `;

  const [rows] = await db.query(query, [petId]);

  return rows;
};

exports.addPlay = async (petId, increment) => {
  // Validate the increment value
  if (isNaN(increment) || increment === null || increment === undefined) {
    throw new Error("Invalid increment value");
  }

  // Fetch the current playfulness from the database
  const selectQuery = `
    SELECT playfulness
    FROM pets
    WHERE id = ?;
  `;
  const [result] = await db.query(selectQuery, [petId]);

  if (result.length === 0) {
    throw new Error("Pet not found");
  }

  // Get the current playfulness value (default to 0 if it's null)
  let currentPlayfulness = result[0].playfulness || 0;

  // Add the increment to the current playfulness
  currentPlayfulness += increment;

  if (currentPlayfulness >= 100) {
    currentPlayfulness = 100;
  }

  // Update the playfulness value in the database
  const updateQuery = `
    UPDATE pets
    SET playfulness = ?
    WHERE id = ?;
  `;

  const [updateResult] = await db.query(updateQuery, [currentPlayfulness, petId]);

  return updateResult;
}

exports.setActiveSoap = async (petId, soapType) => {
  // First, set all soaps for this pet to not in use
  await db.query(`
    UPDATE pet_bath_soap
    SET is_in_use = FALSE
    WHERE pet_id = ?
  `, [petId]);

  // Check if the soap type exists for this pet
  const [existingSoap] = await db.query(`
    SELECT * FROM pet_bath_soap WHERE pet_id = ? AND soap_type = ?
  `, [petId, soapType]);

  if (existingSoap.length > 0) {
    // If it exists, set it as active
    await db.query(`
      UPDATE pet_bath_soap
      SET is_in_use = TRUE
      WHERE pet_id = ? AND soap_type = ?
    `, [petId, soapType]);
  } else {
    // If it doesn't exist, create it with quantity 0 and set as active
    await db.query(`
      INSERT INTO pet_bath_soap (pet_id, soap_type, quantity, is_in_use)
      VALUES (?, ?, 0, TRUE)
    `, [petId, soapType]);
  }

  return {
    pet_id: petId,
    soap_type: soapType,
    is_in_use: true,
    message: 'Active soap updated successfully'
  };
};