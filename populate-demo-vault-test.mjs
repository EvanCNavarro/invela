/**
 * Test Script for Demo File Vault Population
 * 
 * This script tests the file vault population feature by:
 * 1. Finding a demo company
 * 2. Populating its file vault with demo files
 * 3. Verifying the files were added correctly
 */

// Import the populate function (using ES module syntax)
import { populateCompanyFileVault } from './populate-demo-file-vault.js';
import { getAllDemoCompanies, isCompanyDemo } from './server/utils/demo-helpers.js';
import { db } from './db/index.ts';
import { files, companies } from './db/schema.ts';
import { eq } from 'drizzle-orm';

// Define the company ID to use for testing
// If not specified, will find the first demo company or create one
const TEST_COMPANY_ID = 318; // DemoTest1 company

async function runTest() {
  console.log('=== Demo File Vault Population Test ===');
  
  // Step 1: Find the test company or find the first demo company
  let companyId = TEST_COMPANY_ID;
  let company;
  
  if (companyId) {
    // Get specific company
    [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    
    if (!company) {
      console.error(`Company with ID ${companyId} not found`);
      return;
    }
    
    // Verify it's a demo company
    const isDemoCompany = await isCompanyDemo(companyId);
    
    if (!isDemoCompany) {
      console.error(`Company with ID ${companyId} is not a demo company`);
      return;
    }
  } else {
    // Find the first demo company
    const demoCompanies = await getAllDemoCompanies();
    
    if (demoCompanies.length === 0) {
      console.error('No demo companies found');
      return;
    }
    
    company = demoCompanies[0];
    companyId = company.id;
    
    console.log(`Using first demo company found: ${company.name} (ID: ${companyId})`);
  }
  
  // Step 2: Check if company already has files
  const existingFiles = await db
    .select()
    .from(files)
    .where(eq(files.company_id, companyId));
    
  console.log(`Company ${company.name} (ID: ${companyId}) has ${existingFiles.length} existing files`);
  
  // Step 3: Populate the file vault
  console.log(`Populating file vault for company ${company.name} (ID: ${companyId})...`);
  
  const result = await populateCompanyFileVault(companyId);
  
  console.log('Population result:', result);
  
  if (!result.success) {
    console.error(`Failed to populate file vault: ${result.error || result.reason}`);
    return;
  }
  
  // Step 4: Verify files were created
  const updatedFiles = await db
    .select()
    .from(files)
    .where(eq(files.company_id, companyId));
    
  console.log(`Company ${company.name} (ID: ${companyId}) now has ${updatedFiles.length} files`);
  
  // Step 5: List the files
  if (updatedFiles.length > 0) {
    console.log('Files:');
    updatedFiles.forEach(file => {
      console.log(`- ${file.name} (ID: ${file.id}, Type: ${file.type})`);
    });
  }
  
  console.log('Test completed successfully');
}

// Run the test
runTest()
  .then(() => {
    console.log('Test script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });