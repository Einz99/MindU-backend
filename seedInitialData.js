// seedInitialData.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// All accounts use password: pass1234
const COMMON_PASSWORD = 'pass1234';

async function seedInitialData() {
  let connection;
  
  try {
    // Connect to Railway MySQL using PUBLIC URL (works from local machine)
    // Railway provides MYSQL_PUBLIC_URL for external connections
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

    console.log('\n📝 Inserting initial data...');

    // Hash password once for all accounts
    const hashedPassword = bcrypt.hashSync(COMMON_PASSWORD, 10);
    const passwordLength = COMMON_PASSWORD.length;

    // Insert Guidance Staff
    await connection.query(`
      INSERT IGNORE INTO staffs (name, email, password, passwordLength, position, section)
      VALUES ('Guidance Staff', 'guidancestaff.mindu@gmail.com', ?, ?, 'Guidance Staff', NULL)
    `, [hashedPassword, passwordLength]);
    console.log('  ✓ Guidance Staff created');

    // Insert 5 Teachers (Advisers)
    const teachers = [
      { name: 'STEM Teacher', email: 'stem12-1.mindu@gmail.com', section: 'STEM 12-1' },
      { name: 'ABM Teacher', email: 'abm12-1.mindu@gmail.com', section: 'ABM 12-1' },
      { name: 'HE Teacher', email: 'he12-1.mindu@gmail.com', section: 'HE 12-1' },
      { name: 'ICT Teacher', email: 'ict12-1.mindu@gmail.com', section: 'ICT 12-1' },
      { name: 'HUMSS Teacher', email: 'humss12-1.mindu@gmail.com', section: 'HUMSS 12-1' }
    ];

    for (const teacher of teachers) {
      await connection.query(`
        INSERT IGNORE INTO staffs (name, email, password, passwordLength, position, section)
        VALUES (?, ?, ?, ?, 'Adviser', ?)
      `, [teacher.name, teacher.email, hashedPassword, passwordLength, teacher.section]);
    }
    console.log('  ✓ Teachers/Advisers created (5 entries)');

    // Insert 5 Students
    const students = [
      { firstName: 'STEM', email: 'stem.mindu@gmail.com', section: 'STEM 12-1', adviser: 'STEM Teacher', age: 17, gender: 'M' },
      { firstName: 'ABM', email: 'abm.mindu@gmail.com', section: 'ABM 12-1', adviser: 'ABM Teacher', age: 18, gender: 'F' },
      { firstName: 'HE', email: 'he.mindu@gmail.com', section: 'HE 12-1', adviser: 'HE Teacher', age: 17, gender: 'F' },
      { firstName: 'ICT', email: 'ict.mindu@gmail.com', section: 'ICT 12-1', adviser: 'ICT Teacher', age: 18, gender: 'M' },
      { firstName: 'HUMSS', email: 'humss.mindu@gmail.com', section: 'HUMSS 12-1', adviser: 'HUMSS Teacher', age: 17, gender: 'F' }
    ];

    for (const student of students) {
      await connection.query(`
        INSERT IGNORE INTO students 
        (email, password, passwordLength, lastName, firstName, section, adviser, status, age, gender, firstLogin, isAskingHelp, chatStatus)
        VALUES (?, ?, ?, 'Student', ?, ?, ?, 'Active', ?, ?, FALSE, FALSE, 'Completed')
      `, [
        student.email,
        hashedPassword,
        passwordLength,
        student.firstName,
        student.section,
        student.adviser,
        student.age,
        student.gender
      ]);
    }
    console.log('  ✓ Students created (5 entries)');

    console.log('\n✅ Initial data seeding complete!');
    console.log('🎉 All initial accounts have been created successfully!');
    console.log('\n📊 Summary:');
    console.log('  • 1 Guidance Staff');
    console.log('  • 5 Teachers (Advisers)');
    console.log('  • 5 Students (one per section)');
    console.log('\n🔑 All accounts use password: pass1234');
    console.log('\n👥 Staff Accounts:');
    console.log('  • guidancestaff.mindu@gmail.com (Guidance Staff)');
    console.log('  • stem12-1.mindu@gmail.com (Adviser - STEM 12-1)');
    console.log('  • abm12-1.mindu@gmail.com (Adviser - ABM 12-1)');
    console.log('  • he12-1.mindu@gmail.com (Adviser - HE 12-1)');
    console.log('  • ict12-1.mindu@gmail.com (Adviser - ICT 12-1)');
    console.log('  • humss12-1.mindu@gmail.com (Adviser - HUMSS 12-1)');
    console.log('\n🎓 Student Accounts:');
    console.log('  • stem.mindu@gmail.com (STEM Student - STEM 12-1)');
    console.log('  • abm.mindu@gmail.com (ABM Student - ABM 12-1)');
    console.log('  • he.mindu@gmail.com (HE Student - HE 12-1)');
    console.log('  • ict.mindu@gmail.com (ICT Student - ICT 12-1)');
    console.log('  • humss.mindu@gmail.com (HUMSS Student - HUMSS 12-1)');

  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the seeder
seedInitialData()
  .then(() => {
    console.log('\n👍 Seed script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });