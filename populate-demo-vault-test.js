/**
 * Test Script for Demo File Vault Population
 * 
 * This script tests the auto-population of demo files in a company's file vault
 * by creating a new demo company and verifying that its file vault is populated.
 */

import { db } from './db/index.ts';
import { companies, files } from './db/schema.ts';
import { eq } from 'drizzle-orm';
import { populateCompanyFileVault } from './populate-demo-file-vault.js';

/**
 * Run the test on an existing demo company
 * 
 * @param {number} companyId - ID of an existing demo company
 */
async function testExistingCompany(companyId) {
  console.log(`\n🧪 Testing file vault population for existing company ${companyId}`);
  
  try {
    // Get company details
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      console.error(`❌ Company with ID ${companyId} not found`);
      return;
    }
    
    console.log(`📊 Company details:`, {
      id: company.id,
      name: company.name,
      isDemo: company.is_demo,
      availableTabs: company.available_tabs
    });
    
    // Check existing files
    const existingFiles = await db
      .select()
      .from(files)
      .where(eq(files.company_id, companyId));
    
    console.log(`📁 Company has ${existingFiles.length} existing files`);
    
    if (existingFiles.length > 0) {
      console.log(`📋 Existing files:`, existingFiles.map(f => f.name));
    }
    
    // Populate company file vault
    console.log(`\n🚀 Running file vault population for company ${companyId}`);
    const result = await populateCompanyFileVault(companyId);
    
    console.log(`\n✅ File vault population result:`, {
      success: result.success,
      reason: result.reason,
      fileCount: result.fileCount || 0,
      status: result.status
    });
    
    // Check files after population
    const updatedFiles = await db
      .select()
      .from(files)
      .where(eq(files.company_id, companyId));
    
    console.log(`\n📁 Company now has ${updatedFiles.length} files:`);
    console.log(`📋 Files:`, updatedFiles.map(f => f.name));
    
  } catch (error) {
    console.error(`❌ Error testing file vault population:`, error);
  }
}

/**
 * Create a new demo company and test file vault population
 */
async function testWithNewCompany() {
  console.log(`\n🧪 Testing file vault population with a new demo company`);
  
  try {
    // Create a new demo company
    const demoCompanyName = `Demo Company Test ${new Date().toISOString().replace(/[:.]/g, '')}`;
    
    console.log(`\n🏢 Creating new demo company: ${demoCompanyName}`);
    
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: demoCompanyName,
        description: 'Test demo company for file vault population',
        category: 'FinTech',
        is_demo: true,
        status: 'active',
        onboarding_company_completed: false,
        available_tabs: ['task-center'],
        created_at: new Date(),
        updated_at: new Date(),
        registry_date: new Date(),
        metadata: {
          created_via: 'demo_test',
          test_created: true,
          created_at: new Date().toISOString()
        }
      })
      .returning();
    
    if (!newCompany) {
      console.error(`❌ Failed to create new demo company`);
      return;
    }
    
    console.log(`✅ Created new demo company:`, {
      id: newCompany.id,
      name: newCompany.name,
      isDemo: newCompany.is_demo
    });
    
    // Wait a moment for async file vault population to occur
    console.log(`\n⏱️ Waiting 2 seconds for async file vault population...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if files were created
    const files = await db
      .select()
      .from(files)
      .where(eq(files.company_id, newCompany.id));
    
    console.log(`\n📁 Auto-populated files for new company:`);
    console.log(`📋 Files (${files.length}):`, files.map(f => f.name));
    
    // Run manual population as fallback
    if (files.length === 0) {
      console.log(`\n🚀 No files found, manually running file vault population`);
      const result = await populateCompanyFileVault(newCompany.id);
      
      console.log(`\n✅ Manual file vault population result:`, {
        success: result.success,
        reason: result.reason,
        fileCount: result.fileCount || 0
      });
      
      // Check files after manual population
      const updatedFiles = await db
        .select()
        .from(files)
        .where(eq(files.company_id, newCompany.id));
      
      console.log(`\n📁 Company now has ${updatedFiles.length} files:`);
      console.log(`📋 Files:`, updatedFiles.map(f => f.name));
    }
    
  } catch (error) {
    console.error(`❌ Error in new company test:`, error);
  }
}

/**
 * Main function
 */
async function main() {
  // Get company ID from command line args or use default
  const companyId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  
  console.log('🚀 Starting demo file vault population test');
  
  if (companyId) {
    await testExistingCompany(companyId);
  } else {
    await testWithNewCompany();
  }
  
  console.log('\n✅ Test completed');
  process.exit(0);
}

// Run the test
main().catch(error => {
  console.error(`❌ Unhandled error:`, error);
  process.exit(1);
});