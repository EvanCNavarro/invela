/**
 * Test Script for Demo File Vault Direct Implementation
 * 
 * This script tests our direct file vault population implementation by:
 * 1. Creating a demo company directly in the database
 * 2. Calling the populateDemoFileVault function directly
 * 3. Verifying that files were created successfully
 */

// Use CommonJS imports for compatibility
const { db } = require('./db/index.ts');
const { companies, files } = require('./db/schema.ts');
const { eq } = require('drizzle-orm');
const crypto = require('crypto');

/**
 * Create a test demo company
 * 
 * @returns {Promise<Object>} Created company
 */
async function createTestDemoCompany() {
  const companyName = `DemoTest${Date.now()}`;
  console.log(`Creating test demo company: ${companyName}`);
  
  // Create the company with is_demo = true
  const [company] = await db.insert(companies)
    .values({
      name: companyName,
      description: `Demo company for testing file vault population`,
      category: 'FinTech',
      status: 'active',
      accreditation_status: 'PENDING',
      onboarding_company_completed: false,
      available_tabs: ['task-center'],
      is_demo: true,
      metadata: {
        created_via: 'test-script',
        created_at: new Date().toISOString(),
        test_id: crypto.randomBytes(8).toString('hex')
      },
      registry_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning();
    
  console.log(`Created demo company with ID: ${company.id}`);
  return company;
}

/**
 * Check if the company has files in its vault
 * 
 * @param {number} companyId - Company ID to check
 * @returns {Promise<Array>} - Array of files found
 */
async function checkFileVault(companyId) {
  const companyFiles = await db
    .select({
      id: files.id,
      name: files.name,
      type: files.type,
      createdAt: files.created_at
    })
    .from(files)
    .where(eq(files.company_id, companyId));
    
  console.log(`Found ${companyFiles.length} files for company ${companyId}`);
  
  if (companyFiles.length > 0) {
    companyFiles.forEach(file => {
      console.log(`- ${file.name} (ID: ${file.id}, Type: ${file.type})`);
    });
  }
  
  return companyFiles;
}

/**
 * Run the test
 */
async function runTest() {
  console.log('=== Starting Demo File Vault Direct Implementation Test ===');
  
  try {
    // Step 1: Create a new demo company
    const company = await createTestDemoCompany();
    
    // Step 2: Check if the company already has files (it shouldn't)
    console.log('\nChecking initial file vault state...');
    const initialFiles = await checkFileVault(company.id);
    
    if (initialFiles.length > 0) {
      console.log('WARNING: Company already has files in its vault. This is unexpected.');
    }
    
    // Step 3: Directly import and call the file vault population function
    console.log('\nPopulating file vault...');
    const demoFileVault = require('./server/utils/demo-file-vault.js');
    const populationResult = await demoFileVault.populateDemoFileVault(company);
    
    console.log('Vault population result:', populationResult);
    
    // Step 4: Verify files were created
    console.log('\nVerifying file vault population...');
    const finalFiles = await checkFileVault(company.id);
    
    // Step 5: Print test results
    console.log('\n=== Test Results ===');
    console.log(`Company: ${company.name} (ID: ${company.id})`);
    console.log(`Initial file count: ${initialFiles.length}`);
    console.log(`Final file count: ${finalFiles.length}`);
    console.log(`Files added: ${finalFiles.length - initialFiles.length}`);
    console.log(`Test result: ${finalFiles.length > 0 ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    return {
      success: finalFiles.length > 0,
      company,
      initialFiles,
      finalFiles
    };
  } catch (error) {
    console.error('\nTest failed with error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runTest()
  .then(result => {
    console.log(`\nTest completed at ${new Date().toISOString()}`);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\nUnexpected error running test:', error);
    process.exit(1);
  });