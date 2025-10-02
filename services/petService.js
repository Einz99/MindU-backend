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


