/**
 * Direct test script for testing demo file vault population
 */

import { db } from './db/index.ts';
import { companies, files } from './db/schema.ts';
import { eq } from 'drizzle-orm';

// Create a demo company for testing
async function createTestCompany() {
  const companyName = `DemoTest${Date.now()}`;
  console.log(`Creating test demo company: ${companyName}`);
  
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
        created_at: new Date().toISOString()
      }
    })
    .returning();
    
  console.log(`Created company: ID=${company.id}, Name=${company.name}`);
  return company;
}

// Check files in company vault
async function checkCompanyFiles(companyId) {
  const companyFiles = await db
    .select({
      id: files.id,
      name: files.name,
      type: files.type
    })
    .from(files)
    .where(eq(files.company_id, companyId));
    
  console.log(`Found ${companyFiles.length} files for company ID ${companyId}`);
  
  if (companyFiles.length > 0) {
    companyFiles.forEach(file => {
      console.log(`- ${file.name} (${file.type}) - ID: ${file.id}`);
    });
  }
  
  return companyFiles;
}

// Run the test
async function runTest() {
  try {
    // Create a demo company
    const company = await createTestCompany();
    
    // Check initial file count
    console.log("\nChecking initial file count...");
    const initialFiles = await checkCompanyFiles(company.id);
    
    // Import the file vault utility
    const { populateDemoFileVault } = await import('./server/utils/demo-file-vault.js');
    
    // Populate the file vault
    console.log("\nPopulating file vault...");
    const result = await populateDemoFileVault(company);
    console.log("Populate result:", result);
    
    // Check final file count
    console.log("\nChecking final file count...");
    const finalFiles = await checkCompanyFiles(company.id);
    
    // Summary
    console.log("\n=== Demo File Vault Test Results ===");
    console.log(`Company: ${company.name} (ID: ${company.id})`);
    console.log(`Initial file count: ${initialFiles.length}`);
    console.log(`Final file count: ${finalFiles.length}`);
    console.log(`Files added: ${finalFiles.length - initialFiles.length}`);
    console.log(`Test status: ${finalFiles.length > 0 ? "PASSED ✅" : "FAILED ❌"}`);
    
  } catch (error) {
    console.error("Error testing demo file vault:", error);
  }
}

// Execute the test
runTest();