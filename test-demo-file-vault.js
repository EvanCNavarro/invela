/**
 * Test for Demo File Vault Population
 * 
 * This script creates a new demo company and verifies that its file vault
 * is automatically populated with the required CSV files.
 */

import { db } from './db/index.js';
import { companies, files } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { processNewCompany } from './server/hooks/demo-company-hooks.js';
import { logger } from './server/utils/logger.js';

// Configuration for testing
const TEST_COMPANY_NAME = "DemoTest" + Date.now(); // Ensure unique name
const TEST_COMPANY_CATEGORY = "Bank";
const TEST_COMPANY_REVENUE_TIER = "small";

/**
 * Create a new demo company for testing
 */
async function createDemoCompany() {
  console.log(`Creating demo company: ${TEST_COMPANY_NAME}`);

  const [company] = await db.insert(companies)
    .values({
      name: TEST_COMPANY_NAME,
      category: TEST_COMPANY_CATEGORY,
      revenue_tier: TEST_COMPANY_REVENUE_TIER,
      is_demo: true,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning();

  console.log(`Demo company created: ID=${company.id}, Name=${company.name}`);
  return company;
}

/**
 * Verify that file vault has been populated
 */
async function verifyFileVault(companyId) {
  console.log(`Verifying file vault for company ID ${companyId}`);

  // Get all files associated with the company
  const companyFiles = await db
    .select()
    .from(files)
    .where(eq(files.company_id, companyId));

  console.log(`Company has ${companyFiles.length} files in the vault`);

  // Log the file names
  companyFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} (ID: ${file.id}, Type: ${file.type})`);
  });

  // Check for expected files
  const expectedKeywords = ['SOC 2', 'ISO 27001', 'Penetration Test', 'Business Continuity Plan'];
  const foundKeywords = expectedKeywords.map(keyword => {
    const found = companyFiles.some(file => file.name.includes(keyword));
    return { keyword, found };
  });

  console.log("\nVerification results:");
  foundKeywords.forEach(item => {
    console.log(`- ${item.keyword}: ${item.found ? '✅ Found' : '❌ Missing'}`);
  });

  return {
    success: foundKeywords.every(item => item.found),
    totalFiles: companyFiles.length,
    foundKeywords,
    allFiles: companyFiles
  };
}

/**
 * Run the complete test
 */
async function runTest() {
  try {
    console.log("=== Starting Demo File Vault Population Test ===");
    
    // Step 1: Create a new demo company
    const company = await createDemoCompany();
    
    // Step 2: Manually trigger the post-creation hook
    console.log("\nTrigger post-creation processing...");
    const processResult = await processNewCompany(company);
    console.log("Processing result:", processResult);
    
    // Step 3: Verify the file vault has been populated
    console.log("\nVerifying file vault population...");
    const verificationResult = await verifyFileVault(company.id);
    
    // Step 4: Print the summary
    console.log("\n=== Test Summary ===");
    console.log(`Company: ${company.name} (ID: ${company.id})`);
    console.log(`Files created: ${verificationResult.totalFiles}`);
    console.log(`Test result: ${verificationResult.success ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // Return the test results
    return {
      success: verificationResult.success,
      company,
      verificationResult
    };
  } catch (error) {
    console.error("Test failed with error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test and output the results
runTest()
  .then(result => {
    console.log("\nTest completed at:", new Date().toISOString());
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error in test:", error);
    process.exit(1);
  });