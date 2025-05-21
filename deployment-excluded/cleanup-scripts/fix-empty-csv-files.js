/**
 * Fix Empty CSV Files
 * 
 * This script fixes empty CSV files by regenerating them with case-insensitive
 * status matching for 'complete' responses. It targets KY3P and Open Banking
 * form submissions.
 */

// Specify CommonJS extension to avoid ESM issues
import { db } from './server/db.js';
import { tasks, files } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { createTaskFile } from './server/services/fileCreation.js';

// Task IDs to fix
const TASK_IDS = [780, 779];  // Open Banking and KY3P tasks

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}[CSVFix] ${message}${colors.reset}`);
}

/**
 * Fix empty CSV files for specified tasks
 */
async function fixEmptyCsvFiles() {
  try {
    log('Starting CSV fix for tasks...', colors.blue);
    
    for (const taskId of TASK_IDS) {
      log(`Processing task ${taskId}...`, colors.blue);
      
      // Fetch task details
      const taskResult = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
        
      if (!taskResult.length) {
        log(`Task ${taskId} not found, skipping`, colors.red);
        continue;
      }
      
      const task = taskResult[0];
      log(`Task ${taskId} (${task.task_type}) has status: ${task.status}`, colors.cyan);
      
      // Get the existing file if any
      const fileId = task.metadata?.fileId;
      let oldFileSize = 0;
      
      if (fileId) {
        const fileResult = await db.select()
          .from(files)
          .where(eq(files.id, fileId))
          .limit(1);
          
        if (fileResult.length) {
          const file = fileResult[0];
          oldFileSize = file.size;
          log(`Existing file: ${file.name} (${fileId}) with size ${file.size} bytes`, 
            file.size > 100 ? colors.green : colors.yellow);
        } else {
          log(`Referenced file ID ${fileId} not found in database`, colors.red);
        }
      } else {
        log(`No file ID found in task metadata`, colors.yellow);
      }
      
      // Create a simple formData object for file regeneration
      const formData = {
        taskId,
        formType: task.task_type,
        companyId: task.company_id
      };
      
      log(`Regenerating file for task ${taskId} (${task.task_type})...`, colors.blue);
      
      // Generate a new file
      const fileResult = await createTaskFile(
        taskId,
        task.task_type,
        formData,
        task.company_id,
        320 // Admin user ID
      );
      
      if (fileResult.success) {
        // Get the new file size
        const newFileResult = await db.select()
          .from(files)
          .where(eq(files.id, fileResult.fileId))
          .limit(1);
          
        const newFileSize = newFileResult.length ? newFileResult[0].size : 0;
        
        log(`File created successfully: ${fileResult.fileName} (ID: ${fileResult.fileId})`, colors.green);
        log(`Size comparison: ${oldFileSize} bytes -> ${newFileSize} bytes`, 
          newFileSize > oldFileSize ? colors.green : colors.yellow);
        
        // Update task metadata with new file info
        const updatedMetadata = {
          ...(task.metadata || {}),
          fileId: fileResult.fileId,
          fileName: fileResult.fileName,
          submitted: true,
          submittedAt: new Date().toISOString()
        };
        
        await db.update(tasks)
          .set({
            metadata: updatedMetadata,
            updated_at: new Date()
          })
          .where(eq(tasks.id, taskId));
          
        log('Task metadata updated with new file information', colors.green);
        
        // Check the size difference
        if (newFileSize > oldFileSize) {
          log(`✅ SUCCESS! File size increased from ${oldFileSize} to ${newFileSize} bytes`, colors.green);
        } else if (newFileSize === oldFileSize) {
          log(`⚠️ WARNING: File size didn't change (${newFileSize} bytes)`, colors.yellow);
        } else {
          log(`❌ ERROR: New file is smaller (${newFileSize} bytes) than old file (${oldFileSize} bytes)`, colors.red);
        }
      } else {
        log(`File creation failed: ${fileResult.error}`, colors.red);
      }
      
      log(`Task ${taskId} processing complete`, colors.blue);
      log('-'.repeat(50), colors.reset);
    }
    
    log('CSV fix script completed', colors.blue);
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Clean up
    process.exit(0);
  }
}

// Execute the function
fixEmptyCsvFiles().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});