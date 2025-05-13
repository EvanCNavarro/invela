/**
 * Force Form Submission Status Update 
 * 
 * This script force-updates the status of any form from "ready_for_submission" to "submitted"
 * by directly updating the database and then broadcasting WebSocket messages.
 * 
 * Usage: node update-form-submission-status.js [taskId] [formType]
 * Example: node update-form-submission-status.js 820 open_banking
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
require('dotenv').config();

// Terminal colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Get task ID from command line or use default
const taskId = parseInt(process.argv[2]) || 820;
const formType = process.argv[3] || 'open_banking';

/**
 * Force update a task's status to "submitted" with 100% progress
 * @param {number} taskId - The task ID to update
 * @returns {Promise<Object>} - The updated task
 */
async function updateTaskStatus(taskId) {
  console.log(`${colors.bright}${colors.cyan}[Task Update]${colors.reset} Forcing task ${taskId} status to "submitted"...`);
  
  try {
    // Check current task state first
    const taskCheck = await pool.query(
      `SELECT id, status, progress, company_id, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (taskCheck.rows.length === 0) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    const task = taskCheck.rows[0];
    console.log(`${colors.blue}[Task Update]${colors.reset} Current task state:`, {
      id: task.id,
      status: task.status,
      progress: task.progress,
      companyId: task.company_id,
      hasFile: task.metadata?.fileId ? true : false,
      fileId: task.metadata?.fileId,
      submissionDate: task.metadata?.submissionDate,
      submittedFlag: task.metadata?.submitted
    });
    
    // Update task status and add proper metadata
    const submissionDate = task.metadata?.submissionDate || new Date().toISOString();
    const updateResult = await pool.query(
      `UPDATE tasks
       SET status = 'submitted',
           progress = 100,
           metadata = jsonb_set(
             jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{submitted}',
               'true'::jsonb
             ),
             '{submissionDate}',
             to_jsonb($2::text)
           ),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, progress, company_id, metadata`,
      [taskId, submissionDate]
    );
    
    if (updateResult.rows.length === 0) {
      throw new Error(`Failed to update task ${taskId}`);
    }
    
    const updatedTask = updateResult.rows[0];
    console.log(`${colors.green}[Task Update]${colors.reset} Task updated successfully:`, {
      id: updatedTask.id,
      status: updatedTask.status,
      progress: updatedTask.progress,
      companyId: updatedTask.company_id,
      hasSubmitted: updatedTask.metadata?.submitted,
      submissionDate: updatedTask.metadata?.submissionDate
    });
    
    return updatedTask;
  } catch (error) {
    console.error(`${colors.red}[Task Update]${colors.reset} Error updating task status:`, error);
    throw error;
  }
}

/**
 * Broadcast form submission completion via the API
 * This uses the form submission API endpoint to ensure proper WebSocket notification
 */
async function broadcastFormSubmissionComplete(taskId, formType, companyId) {
  console.log(`${colors.bright}${colors.magenta}[Broadcast]${colors.reset} Broadcasting form submission completion...`);
  
  try {
    // First try the direct API method
    const apiUrl = `http://localhost:3000/api/forms/broadcast-completed/${formType}/${taskId}`;
    console.log(`${colors.cyan}[Broadcast]${colors.reset} Calling API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companyId,
        source: 'status-update-script',
        metadata: {
          forcedUpdate: true,
          timestamp: new Date().toISOString()
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`${colors.green}[Broadcast]${colors.reset} API broadcast successful:`, result);
      return result;
    } else {
      console.warn(`${colors.yellow}[Broadcast]${colors.reset} API broadcast failed with status ${response.status}, falling back to direct method`);
    }
  } catch (error) {
    console.warn(`${colors.yellow}[Broadcast]${colors.reset} API broadcast error, falling back to direct method:`, error.message);
  }
  
  // Fallback: Direct database insertion of broadcast message
  try {
    console.log(`${colors.cyan}[Broadcast]${colors.reset} Using direct database insertion for broadcast...`);
    
    // Insert task_update message
    await pool.query(
      `INSERT INTO websocket_messages (
         type,
         message,
         created_at,
         metadata
       ) VALUES (
         'task_update',
         $1::jsonb,
         NOW(),
         '{"broadcast": true, "source": "form-status-updater"}'::jsonb
       )`,
      [JSON.stringify({
        id: taskId,
        taskId: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          formType,
          source: 'form-status-updater',
          finalCompletion: true,
          submissionComplete: true,
          timestamp: new Date().toISOString()
        }
      })]
    );
    
    // Insert form_submission_completed message
    await pool.query(
      `INSERT INTO websocket_messages (
         type,
         message,
         created_at,
         metadata
       ) VALUES (
         'form_submission_completed',
         $1::jsonb,
         NOW(),
         '{"broadcast": true, "source": "form-status-updater"}'::jsonb
       )`,
      [JSON.stringify({
        taskId,
        formType,
        companyId,
        status: 'success',
        metadata: {
          source: 'final_completion',
          submissionComplete: true,
          timestamp: new Date().toISOString()
        }
      })]
    );
    
    console.log(`${colors.green}[Broadcast]${colors.reset} Direct database broadcast messages inserted successfully`);
    return { success: true, method: 'direct-insert' };
  } catch (error) {
    if (error.message.includes('relation "websocket_messages" does not exist')) {
      console.log(`${colors.yellow}[Broadcast]${colors.reset} WebSocket messages table doesn't exist. This is not critical.`);
      return { success: true, method: 'none-available' };
    }
    
    console.error(`${colors.red}[Broadcast]${colors.reset} Failed to insert broadcast messages:`, error);
    throw error;
  }
}

/**
 * Main function to update form submission status
 */
async function updateFormSubmissionStatus(taskId, formType) {
  console.log(`\n${colors.bright}${colors.green}=== Starting Form Submission Status Update ===${colors.reset}`);
  console.log(`Task: ${taskId}, Form Type: ${formType}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    // 1. Update task status in the database
    const updatedTask = await updateTaskStatus(taskId);
    
    // 2. Broadcast form submission completion
    await broadcastFormSubmissionComplete(taskId, formType, updatedTask.company_id);
    
    console.log(`\n${colors.bright}${colors.green}=== Form Submission Status Update Completed Successfully ===${colors.reset}`);
    console.log(`The form status for task ${taskId} has been updated to "submitted" (100%).`);
    console.log(`Please refresh the application UI to see the changes.\n`);
    
    return true;
  } catch (error) {
    console.error(`\n${colors.bright}${colors.red}=== Form Submission Status Update Failed ===${colors.reset}`);
    console.error(`Error: ${error.message}\n`);
    return false;
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the update function
updateFormSubmissionStatus(taskId, formType).catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});