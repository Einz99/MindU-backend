// seedAdditionalData.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// All accounts use password: UserTesting123
const COMMON_PASSWORD = 'UserTesting123';

async function seedAdditionalData() {
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

    console.log('\n🔄 Step 1: Updating existing 5 advisers names...');
    
    // Update existing 5 advisers' names
    const adviserUpdates = [
      { oldEmail: 'stem12-1.mindu@gmail.com', newName: 'STEM 12-1 Teacher' },
      { oldEmail: 'abm12-1.mindu@gmail.com', newName: 'ABM 12-1 Teacher' },
      { oldEmail: 'he12-1.mindu@gmail.com', newName: 'HE 12-1 Teacher' },
      { oldEmail: 'ict12-1.mindu@gmail.com', newName: 'ICT 12-1 Teacher' },
      { oldEmail: 'humss12-1.mindu@gmail.com', newName: 'HUMSS 12-1 Teacher' }
    ];

    for (const update of adviserUpdates) {
      await connection.query(
        'UPDATE staffs SET name = ? WHERE email = ?',
        [update.newName, update.oldEmail]
      );
    }
    console.log('  ✓ Updated 5 existing advisers names');

    console.log('\n➕ Step 2: Adding Admin and Guidance Counselor...');
    
    // Add Admin (no section)
    await connection.query(`
      INSERT IGNORE INTO staffs (name, email, password, passwordLength, position, section)
      VALUES ('Admin', 'admin.mindu@gmail.com', ?, ?, 'Admin', NULL)
    `, [hashedPassword, passwordLength]);
    console.log('  ✓ Admin created');

    // Add Guidance Counselor (no section)
    await connection.query(`
      INSERT IGNORE INTO staffs (name, email, password, passwordLength, position, section)
      VALUES ('Guidance Counselor', 'guidancecounselor.mindu@gmail.com', ?, ?, 'Guidance Counselor', NULL)
    `, [hashedPassword, passwordLength]);
    console.log('  ✓ Guidance Counselor created');

    console.log('\n➕ Step 3: Adding 15 more advisers (4 per strand, sections 12-2 to 12-4)...');
    
    // Add 15 more advisers (3 more per strand: sections 12-2, 12-3, 12-4)
    const strands = ['STEM', 'ABM', 'HE', 'ICT', 'HUMSS'];
    let adviserCount = 0;

    for (const strand of strands) {
      for (let section = 2; section <= 4; section++) {
        const sectionName = `${strand} 12-${section}`;
        const teacherName = `${strand} 12-${section} Teacher`;
        const email = `${strand.toLowerCase()}12-${section}.mindu@gmail.com`;
        
        await connection.query(`
          INSERT IGNORE INTO staffs (name, email, password, passwordLength, position, section)
          VALUES (?, ?, ?, ?, 'Adviser', ?)
        `, [teacherName, email, hashedPassword, passwordLength, sectionName]);
        
        adviserCount++;
      }
    }
    console.log(`  ✓ Added ${adviserCount} more advisers`);

    console.log('\n🔄 Step 4: Updating existing 5 students names...');
    
    // Update existing 5 students' names
    const studentUpdates = [
      { oldEmail: 'stem.mindu@gmail.com', newFirstName: 'STEM 12-1 1' },
      { oldEmail: 'abm.mindu@gmail.com', newFirstName: 'ABM 12-1 1' },
      { oldEmail: 'he.mindu@gmail.com', newFirstName: 'HE 12-1 1' },
      { oldEmail: 'ict.mindu@gmail.com', newFirstName: 'ICT 12-1 1' },
      { oldEmail: 'humss.mindu@gmail.com', newFirstName: 'HUMSS 12-1 1' }
    ];

    for (const update of studentUpdates) {
      await connection.query(
        'UPDATE students SET firstName = ? WHERE email = ?',
        [update.newFirstName, update.oldEmail]
      );
    }
    console.log('  ✓ Updated 5 existing students names');

    console.log('\n➕ Step 5: Adding 55 more students (3 per adviser)...');
    
    let studentCount = 0;
    const genders = ['M', 'F'];
    const ages = [17, 18];

    for (const strand of strands) {
      for (let section = 1; section <= 4; section++) {
        const sectionName = `${strand} 12-${section}`;
        const adviserName = `${strand} 12-${section} Teacher`;
        
        // Start from student 2 for section 1 (since student 1 already exists)
        // Start from student 1 for sections 2-4
        const startStudent = section === 1 ? 2 : 1;
        const endStudent = section === 1 ? 3 : 3; // 2 more for section 1, 3 for others
        
        for (let studentNum = startStudent; studentNum <= endStudent; studentNum++) {
          const firstName = `${strand} 12-${section} ${studentNum}`;
          const email = `${strand.toLowerCase()}12-${section}-${studentNum}.mindu@gmail.com`;
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
        }
      }
    }
    console.log(`  ✓ Added ${studentCount} more students`);

    console.log('\n✅ Additional data seeding complete!');
    console.log('🎉 All accounts have been created/updated successfully!');
    console.log('\n📊 Summary:');
    console.log('  • Updated 5 existing advisers names');
    console.log('  • Added 1 Admin (no section)');
    console.log('  • Added 1 Guidance Counselor (no section)');
    console.log('  • Added 15 more advisers (3 per strand for sections 12-2 to 12-4)');
    console.log('  • Total Advisers: 20');
    console.log('  • Updated 5 existing students names');
    console.log('  • Added 55 more students');
    console.log('  • Total Students: 60 (3 per adviser)');
    console.log('\n🔑 All accounts use password: UserTesting123');
    
    console.log('\n👥 Non-Section Staff:');
    console.log('  • admin.mindu@gmail.com (Admin)');
    console.log('  • guidancestaff.mindu@gmail.com (Guidance Staff)');
    console.log('  • guidancecounselor.mindu@gmail.com (Guidance Counselor)');
    
    console.log('\n👨‍🏫 Advisers by Strand (4 per strand):');
    for (const strand of strands) {
      console.log(`\n  ${strand}:`);
      for (let section = 1; section <= 4; section++) {
        console.log(`    • ${strand.toLowerCase()}12-${section}.mindu@gmail.com (${strand} 12-${section} Teacher)`);
      }
    }
    
    console.log('\n🎓 Students (3 per section):');
    for (const strand of strands) {
      for (let section = 1; section <= 4; section++) {
        console.log(`\n  ${strand} 12-${section}:`);
        for (let studentNum = 1; studentNum <= 3; studentNum++) {
          console.log(`    • ${strand.toLowerCase()}12-${section}-${studentNum}.mindu@gmail.com`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error seeding additional data:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the seeder
seedAdditionalData()
  .then(() => {
    console.log('\n👍 Seed script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });