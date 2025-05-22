/**
 * Test script for ensuring demo file vault files are physically stored
 * 
 * This script tests that files are properly stored on disk when added to the file vault
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { populateDemoFileVault } from './server/utils/demo-file-vault.js';

const { Client } = pg;

async function testFileStorage() {
  console.log('Starting file storage test...');
  
  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get a demo company for testing
    const companyQuery = "SELECT id, name FROM companies WHERE is_demo = true AND category = 'FinTech' LIMIT 1";
    const companyResult = await client.query(companyQuery);
    
    if (companyResult.rows.length === 0) {
      console.error('No demo FinTech company found for testing');
      return;
    }
    
    const company = companyResult.rows[0];
    console.log(`Found demo company for testing: ID ${company.id} (${company.name})`);
    
    // Delete existing files for this company to force repopulation
    await client.query('DELETE FROM files WHERE company_id = $1', [company.id]);
    console.log(`Cleared existing files for company ${company.id}`);
    
    // Run the file vault population
    console.log(`Running file vault population for company ${company.id}...`);
    const result = await populateDemoFileVault(company);
    
    console.log('Population result:', result);
    
    if (!result.success) {
      console.error('File vault population failed:', result.error);
      return;
    }
    
    // Check if files were physically created
    console.log('\nVerifying physical file storage:');
    const fileQuery = "SELECT id, name, path, size, type, status FROM files WHERE company_id = $1";
    const fileResult = await client.query(fileQuery, [company.id]);
    
    // Check each file
    for (const file of fileResult.rows) {
      const filePath = path.join(process.cwd(), 'uploads', file.path);
      
      console.log(`\nChecking file: ${file.name} (Path: ${file.path})`);
      
      try {
        const stats = fs.statSync(filePath);
        console.log(`✅ File exists on disk: ${filePath}`);
        console.log(`   Size: ${stats.size} bytes (DB record: ${file.size} bytes)`);
        
        // Verify file content
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`   Content: ${content.length} bytes, first 50 chars: "${content.substring(0, 50)}..."`);
      } catch (error) {
        console.error(`❌ File not found on disk: ${filePath}`);
        console.error(`   Error: ${error.message}`);
      }
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

testFileStorage().catch(console.error);