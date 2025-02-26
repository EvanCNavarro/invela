// Login test script
require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const bcrypt = require('bcrypt');
const readline = require('readline');

// Configure Neon with WebSockets
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create a minimal pool for testing
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
});

// Function to compare passwords using bcrypt
async function comparePasswords(supplied, stored) {
  try {
    if (!stored) {
      console.error("No stored password provided");
      return false;
    }
    
    if (!supplied) {
      console.error("No supplied password provided");
      return false;
    }
    
    console.log('Comparing passwords:');
    console.log('- Stored hash length:', stored.length);
    console.log('- Stored hash format check:', stored.startsWith('$2a$') || stored.startsWith('$2b$'));
    
    const isValid = await bcrypt.compare(supplied, stored);
    console.log('Password comparison result:', isValid);
    return isValid;
  } catch (error) {
    console.error("Password comparison error:", error.message);
    return false;
  }
}

// Function to get user by email
async function getUserByEmail(client, email) {
  try {
    const normalizedEmail = email.toLowerCase();
    console.log('Looking up user by email:', normalizedEmail);
    
    const query = `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`;
    const result = await client.query(query, [normalizedEmail]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error.message);
    return null;
  }
}

// Main login test function
async function testLogin() {
  let client;
  
  try {
    console.log('🔐 Testing login functionality...');
    client = await pool.connect();
    console.log('✅ Connected to database');
    
    rl.question('Enter email to test: ', async (email) => {
      try {
        // Get user by email
        const user = await getUserByEmail(client, email);
        
        if (!user) {
          console.log('❌ User not found with email:', email);
          cleanup();
          return;
        }
        
        console.log('✅ User found!');
        console.log('User ID:', user.id);
        console.log('Email:', user.email);
        console.log('Has password:', !!user.password);
        
        // Ask for password
        rl.question('Enter password to test: ', async (password) => {
          try {
            const isValid = await comparePasswords(password, user.password);
            
            if (isValid) {
              console.log('✅ Password is correct! Login would succeed.');
            } else {
              console.log('❌ Password is incorrect. Login would fail.');
            }
            
            cleanup();
          } catch (error) {
            console.error('Error during password check:', error);
            cleanup();
          }
        });
      } catch (error) {
        console.error('Error during login test:', error);
        cleanup();
      }
    });
  } catch (error) {
    console.error('Database connection error:', error.message);
    cleanup();
  }
}

function cleanup() {
  rl.close();
  if (client) client.release();
  pool.end().catch(console.error);
}

// Run the test
let client;
testLogin(); 