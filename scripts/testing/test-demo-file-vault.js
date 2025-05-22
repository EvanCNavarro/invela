/**
 * Test script for the Demo File Vault functionality
 * 
 * This script tests whether the file vault auto-population is working correctly,
 * particularly checking for proper file storage and path handling.
 */

import { populateDemoFileVault } from './server/utils/demo-file-vault.js';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// Create a mock company object
const testCompany = {
  id: 999999, // Using a high number to avoid conflicts
  name: 'TestDemoCompany',
  is_demo: true
};

async function getDbClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  return await pool.connect();
}

/**
 * Clean up any test files created during the test
 */
async function cleanupTestFiles(client) {
  console.log('\n--- Cleaning up test files ---');
  
  try {
    // Delete the database records first
    const deleteQuery = 'DELETE FROM files WHERE company_id = $1 RETURNING id, path';
    const result = await client.query(deleteQuery, [testCompany.id]);
    console.log(`Deleted ${result.rowCount} file records from database`);
    
    // Log the deleted file paths
    if (result.rows.length > 0) {
      console.log('Deleted files:');
      for (const row of result.rows) {
        console.log(`  - ID: ${row.id}, Path: ${row.path}`);
        
        // Try to delete the physical file as well
        try {
          const physicalPath = path.join(process.cwd(), 'uploads', 'documents', row.path);
          await fs.unlink(physicalPath);
          console.log(`  - Deleted physical file: ${physicalPath}`);
        } catch (fileError) {
          console.warn(`  - Could not delete physical file for path ${row.path}: ${fileError.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up test files:', error);
  }
}

/**
 * Check if files were correctly saved and are accessible
 */
async function verifyFileStorage(client) {
  console.log('\n--- Verifying file storage ---');
  
  try {
    // Get all files for the test company
    const query = 'SELECT id, name, path, size FROM files WHERE company_id = $1';
    const result = await client.query(query, [testCompany.id]);
    
    if (result.rows.length === 0) {
      console.error('No files found for test company');
      return false;
    }
    
    console.log(`Found ${result.rows.length} files for test company`);
    
    // Check each file
    let allFilesValid = true;
    for (const file of result.rows) {
      console.log(`\nChecking file: ${file.name} (ID: ${file.id})`);
      console.log(`DB Path: ${file.path}`);
      
      // Construct physical path - this should match what's done in the file routes
      const physicalPath = path.join(process.cwd(), 'uploads', 'documents', file.path);
      console.log(`Physical path: ${physicalPath}`);
      
      try {
        // Check if file exists
        const stats = await fs.stat(physicalPath);
        const fileExists = stats.isFile();
        console.log(`File exists: ${fileExists}`);
        
        if (!fileExists) {
          console.error(`File does not exist at path: ${physicalPath}`);
          allFilesValid = false;
          continue;
        }
        
        // Check size
        console.log(`Expected size: ${file.size} bytes, Actual size: ${stats.size} bytes`);
        if (stats.size !== parseInt(file.size)) {
          console.warn(`Size mismatch: Expected ${file.size} bytes, got ${stats.size} bytes`);
        }
        
        // Try to read the content
        const content = await fs.readFile(physicalPath, 'utf-8');
        const contentPreview = content.length > 100 ? content.substring(0, 97) + '...' : content;
        console.log(`Content preview: ${contentPreview}`);
        
        // Validate it's a CSV
        if (!content.includes(',') || !content.includes('\n')) {
          console.warn(`File content doesn't appear to be a valid CSV`);
        } else {
          console.log(`Content appears to be a valid CSV`);
        }
      } catch (error) {
        console.error(`Error checking file ${file.id}:`, error);
        allFilesValid = false;
      }
    }
    
    return allFilesValid;
  } catch (error) {
    console.error('Error verifying file storage:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTest() {
  let client;
  
  try {
    console.log('=== Running Demo File Vault Test ===');
    client = await getDbClient();
    
    // Clean up any existing test files
    await cleanupTestFiles(client);
    
    console.log('\n--- Populating demo file vault ---');
    // Populate the demo file vault
    const result = await populateDemoFileVault(testCompany);
    
    console.log('Population result:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('Failed to populate demo file vault');
      return false;
    }
    
    // Verify that files were saved correctly
    const verificationResult = await verifyFileStorage(client);
    
    console.log('\n=== Test Summary ===');
    console.log(`Files added: ${result.fileCount} of ${result.totalAttempted}`);
    console.log(`Files verified: ${verificationResult ? 'SUCCESS' : 'FAILED'}`);
    
    if (verificationResult) {
      console.log('✅ TEST PASSED: Demo file vault is working correctly!');
    } else {
      console.log('❌ TEST FAILED: Issues were found with the demo file vault');
    }
    
    // Clean up the test files
    await cleanupTestFiles(client);
    
    return verificationResult;
  } catch (error) {
    console.error('Test error:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run the test
runTest()
  .then((success) => {
    console.log(`\nTest completed ${success ? 'successfully' : 'with failures'}`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });