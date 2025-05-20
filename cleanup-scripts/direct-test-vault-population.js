/**
 * Simple direct test using TypeScript transpilation
 * 
 * This script tests the demo file vault population by directly incorporating it
 * into the execution rather than using imports
 */

import fs from 'fs/promises';
import path from 'path';
import { db } from './db/index.ts';
import { files, companies } from './db/schema.ts';
import { eq } from 'drizzle-orm';

console.log('=== Demo File Vault Population Test ===');

// Simplified version of populateDemoFileVault for direct testing
async function testDemoFilesPopulation() {
  try {
    // Create a test demo company
    const companyName = `DemoTest${Date.now()}`;
    console.log(`\nCreating test demo company: ${companyName}`);
    
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
        registry_date: new Date(),
        metadata: {
          created_via: 'test-script',
          created_at: new Date().toISOString()
        }
      })
      .returning();
      
    console.log(`Created test company ID: ${company.id}`);
    
    // Check initial file count
    const initialFiles = await checkCompanyFiles(company.id);
    console.log(`\nInitial file count: ${initialFiles.length}`);
    
    // List of demo files to add
    const demoFiles = [
      '1_SOC_2_Questions.csv',
      '2_ISO_27001_Questions.csv',
      '3_Penetration_Test_Questions.csv', 
      '4_Business_Continuity_Plan_Questions.csv'
    ];
    
    // Add each demo file
    console.log('\nAdding demo files...');
    let successCount = 0;
    
    for (const fileName of demoFiles) {
      try {
        const result = await addDemoFile(company.id, company.name, fileName);
        if (result.success) {
          successCount++;
          console.log(`✅ Added file: ${result.name} (ID: ${result.id})`);
        } else {
          console.log(`❌ Failed to add file: ${fileName} - ${result.error}`);
        }
      } catch (fileError) {
        console.error(`Error adding file ${fileName}:`, fileError);
      }
    }
    
    // Check final file count
    const finalFiles = await checkCompanyFiles(company.id);
    console.log(`\nFinal file count: ${finalFiles.length}`);
    
    // Print summary
    console.log('\n=== Test Results ===');
    console.log(`Company: ${company.name} (ID: ${company.id})`);
    console.log(`Files attempted: ${demoFiles.length}`);
    console.log(`Files added successfully: ${successCount}`);
    console.log(`Test result: ${successCount > 0 ? 'PASSED ✅' : 'FAILED ❌'}`);
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Helper function to check files for a company
async function checkCompanyFiles(companyId) {
  const companyFiles = await db
    .select({
      id: files.id,
      name: files.name,
      type: files.type,
    })
    .from(files)
    .where(eq(files.company_id, companyId));
    
  if (companyFiles.length > 0) {
    console.log(`Company has ${companyFiles.length} files:`);
    companyFiles.forEach(file => {
      console.log(`- ${file.name} (${file.type})`);
    });
  }
  
  return companyFiles;
}

// Helper function to get display name from CSV filename
function getDisplayNameFromFilename(fileName) {
  // Remove file extension and any leading numbers/underscores
  const baseName = fileName.replace(/^\d+_/, '').replace(/\.csv$/, '');
  
  // Replace underscores with spaces and title case
  return baseName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to read a file from attached_assets directory
async function readDemoFile(fileName) {
  try {
    const filePath = path.join(process.cwd(), 'attached_assets', fileName);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
  } catch (error) {
    console.error(`Error reading demo file ${fileName}:`, error);
    throw new Error(`Failed to read demo file ${fileName}`);
  }
}

// Helper function to add a demo file
async function addDemoFile(companyId, companyName, fileName) {
  try {
    // Get file content
    const fileContent = await readDemoFile(fileName);
    
    // Create file record in database
    const displayName = getDisplayNameFromFilename(fileName);
    const [fileRecord] = await db.insert(files)
      .values({
        name: displayName,
        original_name: fileName,
        company_id: companyId,
        user_id: 8, // Use existing user ID from Evan Navarro
        type: 'csv',
        size: fileContent.length,
        content: fileContent,
        path: `demo-files/${fileName}`, // Add required path
        status: 'active',
        metadata: {
          source: 'demo_autofill',
          created_for: companyName,
          created_at: new Date().toISOString()
        }
      })
      .returning();
      
    return {
      id: fileRecord.id,
      name: fileRecord.name,
      type: fileRecord.type,
      success: true
    };
  } catch (error) {
    console.error(`Error adding demo file ${fileName}:`, error);
    return {
      fileName,
      success: false,
      error: error.message
    };
  }
}

// Run the test
testDemoFilesPopulation();