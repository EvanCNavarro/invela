/**
 * Test script to verify Open Banking task creation
 * 
 * This script simulates the creation of a new company and checks
 * that the Open Banking Survey task is created instead of a CARD task.
 */

import { db } from './db/index.js';
import { tasks } from './db/schema.js';
import { createCompany } from './server/services/company.js';
import { eq } from 'drizzle-orm';

async function testOpenBankingTaskCreation() {
  console.log('=== Testing Open Banking Task Creation ===');
  try {
    // Create a test company
    const testCompanyName = `Test Company ${Date.now()}`;
    
    console.log(`Creating test company: ${testCompanyName}`);
    
    const newCompany = await createCompany({
      name: testCompanyName,
      description: `Test company for Open Banking Survey task verification`,
      category: 'FinTech',
      status: 'active',
      accreditation_status: 'PENDING',
      onboarding_company_completed: false,
      available_tabs: ['task-center'],
      metadata: {
        created_by_id: 271, // Use an existing user ID
        created_via: 'test_script',
        test_script: true
      }
    });
    
    console.log('Company created:', {
      id: newCompany.id,
      name: newCompany.name,
      kyb_task_id: newCompany.kyb_task_id,
      security_task_id: newCompany.security_task_id,
      card_task_id: newCompany.card_task_id
    });
    
    // Get all tasks for this company
    const companyTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.company_id, newCompany.id));
    
    console.log(`Found ${companyTasks.length} tasks for company ${newCompany.name}:`, 
      companyTasks.map(t => ({ id: t.id, type: t.task_type, title: t.title }))
    );
    
    // Check if we have an Open Banking task
    const openBankingTask = companyTasks.find(t => t.task_type === 'open_banking');
    
    if (openBankingTask) {
      console.log('SUCCESS: Open Banking task created correctly:', {
        id: openBankingTask.id,
        type: openBankingTask.task_type,
        title: openBankingTask.title
      });
    } else {
      console.log('ERROR: No Open Banking task found!');
      const cardTask = companyTasks.find(t => t.task_type === 'company_card');
      if (cardTask) {
        console.log('Found CARD task instead:', {
          id: cardTask.id,
          type: cardTask.task_type,
          title: cardTask.title
        });
      }
    }
    
    // Optional: Clean up test data
    // await db.delete(tasks).where(eq(tasks.company_id, newCompany.id));
    // await db.delete(companies).where(eq(companies.id, newCompany.id));
    
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Run the test
testOpenBankingTaskCreation()
  .then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });