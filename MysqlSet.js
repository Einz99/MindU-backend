const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTimezone() {
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

    console.log('✅ Connected to MySQL');

    // Check timezone settings
    const [rows] = await connection.query(
      'SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz'
    );
    
    console.log('🌍 Timezone Settings:');
    console.log('  Global timezone:', rows[0].global_tz);
    console.log('  Session timezone:', rows[0].session_tz);
    
    // Check system timezone
    const [systemTz] = await connection.query('SELECT @@system_time_zone as system_tz');
    console.log('  System timezone:', systemTz[0].system_tz);

    // Check current time (using backticks for both aliases)
const [currentTime] = await connection.query('SELECT NOW() as `now_time`, UTC_TIMESTAMP() as `utc_time`');
console.log('📅 Current times:');
console.log('  NOW():', currentTime[0].now_time);
console.log('  UTC_TIMESTAMP():', currentTime[0].utc_time);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

checkTimezone();