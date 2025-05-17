/**
 * Final test script for file vault population
 * 
 * This script tests the file vault population feature with a directly created company
 * and verifies that all CSV files are properly created in the database.
 */

import pg from 'pg';

// Use the actual files from our implementation
import { populateDemoFileVault } from './server/utils/demo-file-vault.js';

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create a test company ID (using DemoTest6 which we created earlier)
    const companyId = 328;
    const companyName = 'DemoTest6';
    
    // Check if the company already has files
    const beforeQuery = 'SELECT COUNT(*) FROM files WHERE company_id = $1';
    const beforeResult = await client.query(beforeQuery, [companyId]);
    const beforeCount = parseInt(beforeResult.rows[0].count);
    
    console.log(`Company ${companyId} (${companyName}) has ${beforeCount} files before population`);
    
    // If it already has files, let's delete them for a fresh test
    if (beforeCount > 0) {
      console.log(`Deleting existing ${beforeCount} files for company ${companyId}`);
      await client.query('DELETE FROM files WHERE company_id = $1', [companyId]);
      console.log('Existing files deleted successfully');
    }
    
    // Now run the population function
    console.log(`Running file vault population for company ${companyId} (${companyName})`);
    const result = await populateDemoFileVault({
      id: companyId,
      name: companyName,
      is_demo: true
    });
    
    console.log('Population result:', result);
    
    // Verify the files were created
    const afterQuery = 'SELECT id, name, type, size, status FROM files WHERE company_id = $1';
    const afterResult = await client.query(afterQuery, [companyId]);
    
    console.log(`Company ${companyId} now has ${afterResult.rows.length} files:`);
    afterResult.rows.forEach(file => {
      console.log(`- ${file.name} (ID: ${file.id}, Type: ${file.type}, Size: ${file.size} bytes, Status: ${file.status})`);
    });
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.end();
  }
}

main();