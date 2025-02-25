import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Log the database URL (with credentials masked)
const dbUrl = process.env.DATABASE_URL || '';
console.log('Database URL configured:', dbUrl ? 'Yes (length: ' + dbUrl.length + ')' : 'No');
if (dbUrl) {
  // Mask credentials in URL for logging
  try {
    const maskedUrl = dbUrl.replace(/(postgres[^:]*:\/\/[^:]+:)[^@]+(@.+)/, '$1*****$2');
    console.log('Database URL pattern:', maskedUrl);
  } catch (e) {
    console.log('Unable to mask database URL');
  }
}

// Create a new pool with longer timeouts to accommodate Neon's serverless cold start
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : { rejectUnauthorized: false }, // Also use SSL in dev for Neon
  connectionTimeoutMillis: 30000, // 30 second timeout (increased from 5s)
  query_timeout: 20000, // 20 second query timeout
  max: 1 // Limit to 1 connection for testing
});

// Function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Connection attempt failed, retrying in ${delay/1000} seconds...`);
    await wait(delay);
    
    return withRetry(fn, retries - 1, delay * 1.5);
  }
}

async function testConnection() {
  console.log('Starting database connection test...');
  console.log('This may take a moment if the database is in sleep mode and needs to wake up...');
  
  let client;
  try {
    // Try to connect with retry logic
    client = await withRetry(() => pool.connect());
    console.log('Successfully connected to database!');
    
    // Test a simple query
    console.log('Testing simple query...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Query result:', result.rows[0]);
    
    // Test database version
    console.log('Checking PostgreSQL version...');
    const versionResult = await client.query('SELECT version()');
    console.log('Database version:', versionResult.rows[0].version);
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    
    // More detailed error diagnosis
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('timeout')) {
      console.log('\nTIMEOUT DIAGNOSIS:');
      console.log('- Check if your Neon database is active (not in sleep mode)');
      console.log('- Verify the Replit environment can connect to external services');
      console.log('- Check if your database URL is correct');
      console.log('- Verify no IP restrictions are in place on your Neon project');
    }
    
    if (errorMessage.includes('certificate')) {
      console.log('\nSSL DIAGNOSIS:');
      console.log('- SSL issues detected. Verify your connection string includes proper SSL parameters');
      console.log('- For Neon, try adding ?sslmode=require to your connection string');
    }
    
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 