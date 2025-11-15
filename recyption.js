const bcrypt = require('bcrypt');

// Passwords to hash
const passwords = [
  'aef100ba7a',
  'c6974eb427',
  '2f3884680e',
  '23a89ec5c0',
  'bf6267ab59',
  '9f225b7e82',
  'b2f4952a86',
  '4cc557e88f',
  'c8a2e38362',
  'c5970171d5',
  'e892cdd945',
  '89b05e3705',
];

// Salt rounds (10 is a good default, same as commonly used)
const saltRounds = 10;

// Function to hash all passwords
async function hashPasswords() {
  console.log('Hashing passwords...\n');
  
  for (const password of passwords) {
    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log(`Original: ${password}`);
      console.log(`Hashed:   ${hashedPassword}`);
      console.log('---');
    } catch (error) {
      console.error(`Error hashing ${password}:`, error);
    }
  }
}

// Run the hashing function
hashPasswords();