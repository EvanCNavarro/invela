// Simple script to test database connection
require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon with WebSockets
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

console.log('🔍 Testing database connection...');
console.log('Database URL configured:', !!process.env.DATABASE_URL);

// Create a minimal pool for testing
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
});

async function runTest() {
  let client;
  
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('✅ Successfully connected to database!');
    
    console.log('\nRunning a test query...');
    const result = await client.query('SELECT current_timestamp as time, current_user as user');
    console.log('✅ Query succeeded!');
    console.log('Server time:', result.rows[0].time);
    console.log('Database user:', result.rows[0].user);
    
    console.log('\nChecking if users table exists...');
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        ) as table_exists
      `);
      
      if (tableCheck.rows[0].table_exists) {
        console.log('✅ Users table exists!');
        
        // Try to count users
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        console.log(`There are ${userCount.rows[0].count} users in the database.`);
        
        // Try to get a sample user (without showing sensitive details)
        const userSample = await client.query(`
          SELECT id, email, 
            CASE WHEN password IS NOT NULL THEN 'Has password' ELSE 'No password' END as password_status,
            created_at
          FROM users LIMIT 1
        `);
        
        if (userSample.rows.length > 0) {
          console.log('Sample user found:');
          console.log(userSample.rows[0]);
        } else {
          console.log('No users found in database.');
        }
      } else {
        console.log('❌ Users table does not exist.');
      }
    } catch (err) {
      console.log('❌ Error checking users table:', err.message);
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database connection test failed:');
    console.error('Error:', error.message);
  } finally {
    if (client) {
      client.release();
      console.log('Database client released.');
    }
    
    // Close the pool
    await pool.end();
    console.log('Pool closed, test complete.');
  }
}

// Run the test
runTest(); 