const petService = require("../services/petService");

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

// Controller to insert a new pet
exports.insertPet = async (req, res) => {
  console.log("inserting Pet");
  try {
    const { student_id, pet_name, pet_type } = req.body; // Get data from request body
    
    // Validate input
    if (!student_id || !pet_name || !pet_type) {
      return res.status(400).json({ message: "Missing required fields: student_id, pet_name, pet_type" });
    }

    const newPet = await petService.insertPet(student_id, pet_name, pet_type); // Call service to insert the pet

    // Return the new pet data
    return res.status(201).json(newPet); // Return the new pet data
  } catch (error) {
    console.error("Error inserting pet:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
