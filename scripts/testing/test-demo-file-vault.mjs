/**
 * Test script for demo file vault population
 * 
 * This script tests the functionality of populating a company's file vault
 * with demo files by directly importing and calling the populateDemoFileVault function
 */

import { populateDemoFileVault } from './server/utils/demo-file-vault.js';
import pg from 'pg';

const { Client } = pg;

async function main() {
  try {
    // Create mock company for testing
    const mockCompany = {
      id: 328, // DemoTest6 company ID
      name: 'DemoTest6',
      is_demo: true
    };
    
    console.log('Testing file vault population for company:', mockCompany);
    
    // Connect to database
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    console.log('Connected to database');
    
    // Check for existing files
    const beforeQuery = 'SELECT id, name, company_id, user_id, status FROM files WHERE company_id = $1';
    const beforeResult = await client.query(beforeQuery, [mockCompany.id]);
    console.log(`Before population: Company ${mockCompany.id} has ${beforeResult.rows.length} files`);
    
    // Call the populate function
    console.log('Running populateDemoFileVault...');
    const result = await populateDemoFileVault(mockCompany);
    console.log('Population result:', result);
    
    // Check for files after population
    const afterQuery = 'SELECT id, name, company_id, user_id, status FROM files WHERE company_id = $1';
    const afterResult = await client.query(afterQuery, [mockCompany.id]);
    console.log(`After population: Company ${mockCompany.id} has ${afterResult.rows.length} files`);
    
    console.log('Files created:');
    afterResult.rows.forEach(file => {
      console.log(`- ${file.name} (ID: ${file.id}, Status: ${file.status})`);
    });
    
    // Clean up
    await client.end();
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

main();