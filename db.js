// db.js
const mysql = require('mysql2/promise');
require("dotenv").config();

const pool = mysql.createPool({
  // Railway provides these exact variable names
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+08:00',  // Manila timezone
  dateStrings: true,
});


// Local host for Development and for fixing error comment top pool if going to do it and reverseback
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   timezone: '+08:00',  // Manila timezone
//   dateStrings: true,
// });

// Test connection on startup
pool.getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL database successfully!");
    console.log(`   Host: ${process.env.MYSQLHOST || 'localhost'}`);
    console.log(`   Database: ${process.env.MYSQLDATABASE || 'local'}`);
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Error connecting to MySQL:", err.message);
  });

module.exports = pool;