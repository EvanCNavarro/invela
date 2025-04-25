/**
 * Test the KY3P demo auto-fill function to verify our database fix
 * 
 * This script ensures that the KY3P demo auto-fill works correctly after
 * renaming the 'is_required' column to 'required' in the ky3p_fields table.
 */

import { db } from './db/index.js';
import { tasks, companies } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { UniversalDemoAutoFillService } from './server/services/universalDemoAutoFillService.js';

async function testKy3pDemoAutoFill() {
  try {
    console.log('Finding a KY3P task associated with a demo company...');
    
    // Find demo companies first
    const demoCompanies = await db.select()
      .from(companies)
      .where(eq(companies.is_demo, true));
      
    if (demoCompanies.length === 0) {
      console.error('No demo companies found in the database.');
      return;
    }
    
    console.log(`Found ${demoCompanies.length} demo companies`);
    
    // Get the IDs of all demo companies
    const demoCompanyIds = demoCompanies.map(company => company.id);
    
    // Find KY3P tasks for demo companies
    console.log('Finding security assessment tasks for demo companies...');
    
    // First try to find security_assessment tasks
    let kyspTasks = [];
    
    for (const companyId of demoCompanyIds) {
      const securityTasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.company_id, companyId),
          eq(tasks.task_type, 'security_assessment')
        ));
        
      if (securityTasks.length > 0) {
        kyspTasks.push(...securityTasks);
        break; // Found what we need
      }
    }
    
    // If no tasks found, look for alternative task types
    if (kyspTasks.length === 0) {
      console.log('No security_assessment tasks found. Checking other task types...');
      
      for (const companyId of demoCompanyIds) {
        const altTasks = await db.select()
          .from(tasks)
          .where(and(
            eq(tasks.company_id, companyId),
            eq(tasks.task_type, 'company_security')
          ));
          
        if (altTasks.length > 0) {
          kyspTasks.push(...altTasks);
          break; // Found what we need
        }
      }
    }
    
    if (kyspTasks.length === 0) {
      console.error('No suitable security assessment tasks found for demo companies.');
      return;
    }
    
    const testTask = kyspTasks[0];
    console.log(`Found task to test: ID=${testTask.id}, Type=${testTask.task_type}, Company=${testTask.company_id}`);
    
    // Create an instance of the service
    const demoService = new UniversalDemoAutoFillService();
    
    // Apply demo data to the task
    console.log('Applying demo data to task...');
    const result = await demoService.applyDemoData(testTask.id, 'ky3p');
    
    console.log('Demo auto-fill result:', result);
    
    if (result.success) {
      console.log('✅ KY3P Demo auto-fill is working correctly!');
      console.log(`Applied demo data to ${result.fieldCount} fields.`);
    } else {
      console.error('❌ Demo auto-fill failed:', result.message);
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testKy3pDemoAutoFill()
  .then(() => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });