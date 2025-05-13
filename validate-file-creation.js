/**
 * Validation script for file creation
 * 
 * This script tests the fixed createTaskFile function in fileCreation.fixed.ts
 * by creating a test form submission and verifying the file is created correctly
 * and appears in the File Vault.
 */

import * as fileCreation from './server/services/fileCreation.fixed.js';
import { db } from './db/index.js';
import { files, tasks } from './db/schema.js';
import { eq } from 'drizzle-orm';

const logger = { info: console.log, error: console.error, warn: console.warn };

async function validateFileCreation() {
  try {
    // Test parameters
    const taskId = 717; // Use the KYB task ID
    const taskType = 'company_kyb';
    const formData = {
      company_name: 'DemoTest',
      business_description: 'This is a test company for file creation validation',
      industry: 'FinTech',
      revenue_tier: 'Mid-Market',
      website: 'https://example.com',
      employees: '50-100',
      legal_form: 'LLC',
      validation_timestamp: new Date().toISOString()
    };
    const companyId = 262; // Demo company
    const userId = 304; // Test user

    console.log('Starting file creation validation...');
    console.log('Parameters:', {
      taskId,
      taskType,
      companyId,
      userId,
      formDataKeys: Object.keys(formData)
    });

    // Call the createTaskFile function with the new parameter order
    const result = await fileCreation.createTaskFile(
      taskId,
      taskType,
      formData,
      companyId,
      userId
    );

    console.log('File creation result:', result);

    if (result.success) {
      console.log('✅ VALIDATION PASSED: File created successfully');
      console.log('File ID:', result.fileId);
      console.log('File Name:', result.fileName);
      
      // Verify the file exists in the database
      const file = await db.query.files.findFirst({
        where: eq(files.id, result.fileId)
      });
      
      if (file) {
        console.log('✅ VALIDATION PASSED: File exists in database');
        console.log('File details:', {
          id: file.id,
          name: file.name,
          status: file.status,
          company_id: file.company_id,
          created_at: file.created_at
        });
      } else {
        console.log('❌ VALIDATION FAILED: File not found in database despite successful creation');
      }
      
      // Now update the task metadata to link the file
      const currentTask = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (currentTask) {
        const currentMetadata = currentTask.metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          fileId: result.fileId,
          fileGenerated: true,
          fileGeneratedAt: new Date().toISOString(),
          fileName: result.fileName
        };
        
        await db.update(tasks)
          .set({
            metadata: updatedMetadata
          })
          .where(eq(tasks.id, taskId));
          
        console.log('✅ VALIDATION PASSED: Task metadata updated with file reference');
      } else {
        console.log('❌ VALIDATION FAILED: Task not found for ID', taskId);
      }
      
      console.log('\nValidation complete! You can now check the File Vault tab to see if the file appears.');
    } else {
      console.log('❌ VALIDATION FAILED: File creation failed');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('❌ VALIDATION FAILED: Unexpected error during validation');
    console.error(error);
  }
}

validateFileCreation();
