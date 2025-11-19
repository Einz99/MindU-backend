// insertSTEMIsaacStudents.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// All accounts use password: pass1234
const COMMON_PASSWORD = 'pass1234';

async function insertSTEMIsaacStudents() {
  let connection;
  
  try {
    // Connect to Railway MySQL using PUBLIC URL (works from local machine)
    const connectionString = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
    
    if (connectionString) {
      console.log('🔗 Connecting using Railway MySQL URL...');
      connection = await mysql.createConnection(connectionString);
    } else {
      console.log('🔗 Connecting using local MySQL...');
      connection = await mysql.createConnection({
              host: process.env.DB_HOST || 'localhost',
              user: process.env.DB_USER || 'root',
              password: process.env.DB_PASS || '',
              database: process.env.DB_NAME || 'railway',
              port: 3306
            });
    }

    console.log('✅ Connected to MySQL database');

    // Hash password once for all accounts
    const hashedPassword = bcrypt.hashSync(COMMON_PASSWORD, 10);
    const passwordLength = COMMON_PASSWORD.length;

    console.log('\n🎓 Adding 10 students to STEM 12-Isaac...');
    
    const adviserName = 'Ronald';
    const sectionName = 'STEM 12-Isaac';
    
    const genders = ['M', 'F'];
    const ages = [17, 18];
    let studentCount = 0;

    for (let studentNum = 1; studentNum <= 10; studentNum++) {
      const firstName = `STEM Isaac ${studentNum}`;
      const email = `st${String(studentNum).padStart(2, '0')}.mindu@gmail.com`;
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const age = ages[Math.floor(Math.random() * ages.length)];
      
      await connection.query(`
        INSERT IGNORE INTO students 
        (email, password, passwordLength, lastName, firstName, section, adviser, status, age, gender, firstLogin, isAskingHelp, chatStatus)
        VALUES (?, ?, ?, 'Student', ?, ?, ?, 'Active', ?, ?, FALSE, FALSE, 'Completed')
      `, [
        email,
        hashedPassword,
        passwordLength,
        firstName,
        sectionName,
        adviserName,
        age,
        gender
      ]);
      
      studentCount++;
      console.log(`  ✓ Added: ${firstName} (${email})`);
    }

    console.log(`\n✅ Successfully created ${studentCount} students for STEM 12-Isaac!`);
    console.log('\n📊 Summary:');
    console.log(`  • Section: ${sectionName}`);
    console.log(`  • Adviser: ${adviserName}`);
    console.log(`  • Students Created: ${studentCount}`);
    console.log('\n🔑 All accounts use password: pass1234');
    
    console.log('\n🎓 Student Accounts:');
    for (let i = 1; i <= 10; i++) {
      console.log(`  • st${String(i).padStart(2, '0')}.mindu@gmail.com (STEM Isaac ${i})`);
    }

  } catch (error) {
    console.error('❌ Error inserting STEM Isaac students:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the insertion
insertSTEMIsaacStudents()
  .then(() => {
    console.log('\n👍 Insertion script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Insertion script failed:', error);
    process.exit(1);
  });
