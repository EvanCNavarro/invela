/**
 * Direct test for demo file vault population
 * 
 * This script tests the demo file vault population functionality directly
 * by calling the function with a mock company object.
 */

const { populateDemoFileVault } = require('./server/utils/demo-file-vault.js');
const { Client } = require('pg');

async function main() {
  try {
    // Connect to the database
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('Connected to database');
    
    // Create a mock company for testing
    const mockCompany = {
      id: 328,
      name: 'DirectTestDemo',
      is_demo: true
    };
    
    // Call the populate function directly
    console.log(`Testing populateDemoFileVault for company: ${mockCompany.name} (${mockCompany.id})`);
    const result = await populateDemoFileVault(mockCompany);
    
    console.log('Result:', result);
    
    // Check if files were created
    const { rows } = await client.query(
      'SELECT id, name, company_id, user_id, status FROM files WHERE company_id = $1',
      [mockCompany.id]
    );
    
    console.log(`Found ${rows.length} files for company ${mockCompany.id}:`);
    rows.forEach(file => {
      console.log(`- ${file.name} (ID: ${file.id})`);
    });
    
    // Clean up
    await client.end();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();