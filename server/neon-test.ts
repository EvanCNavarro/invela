import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
import dns from 'dns';

// Load environment variables
dotenv.config();

// Configure Neon to use WebSocket
neonConfig.webSocketConstructor = ws;

// First, let's check if we can resolve the database hostname
async function checkDnsResolution() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) return false;
    
    // Extract hostname from database URL
    const hostnameMatch = dbUrl.match(/@([^:/@]+)/);
    if (!hostnameMatch) return false;
    
    const hostname = hostnameMatch[1];
    console.log(`Testing DNS resolution for: ${hostname}`);
    
    return new Promise((resolve) => {
      dns.lookup(hostname, (err, address) => {
        if (err) {
          console.error('DNS resolution failed:', err.message);
          resolve(false);
        } else {
          console.log(`DNS resolved to: ${address}`);
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error checking DNS:', error);
    return false;
  }
}

// Log the database URL (with credentials masked)
const dbUrl = process.env.DATABASE_URL || '';
console.log('Database URL configured:', dbUrl ? 'Yes (length: ' + dbUrl.length + ')' : 'No');
if (dbUrl) {
  // Mask credentials in URL for logging
  try {
    const maskedUrl = dbUrl.replace(/(postgres[^:]+:\/\/[^:]+:)[^@]+(@.+)/, '$1*****$2');
    console.log('Database URL pattern:', maskedUrl);
  } catch (e) {
    console.log('Unable to mask database URL');
  }
}

// Create a pool specifically for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires WebSockets which is handled by neonConfig above
  // Short timeouts for testing
  connectionTimeoutMillis: 10000, // 10 second timeout
  idleTimeoutMillis: 15000, // 15 second idle timeout
  max: 1 // Just use a single connection for testing
});

async function testConnection() {
  console.log('Starting Neon database connection test...');
  
  // First check DNS resolution
  const dnsResolved = await checkDnsResolution();
  if (!dnsResolved) {
    console.warn('DNS resolution issues detected - this may cause connection problems');
  }
  
  console.log('Attempting to connect to database...');
  let client;
  try {
    client = await pool.connect();
    console.log('Successfully connected to Neon database!');
    
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
    await pool.end().catch(err => console.error('Error ending pool:', err));
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