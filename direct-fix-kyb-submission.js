/**
 * Direct Fix for KYB Form Submission
 * 
 * This script updates the KYB form task status to 'submitted'
 * and sets the appropriate metadata fields.
 * 
 * Usage: node direct-fix-kyb-submission.js <taskId> [<companyId>]
 */

import pg from 'pg';
import { WebSocketServer } from 'ws';
import http from 'http';

const { Pool } = pg;

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Fix the KYB form submission status
 */
async function fixKybSubmission(taskId, companyId) {
  const client = await pool.connect();
  
  try {
    console.log(`${colors.blue}=== Fixing KYB Submission for Task ${taskId} ===${colors.reset}`);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Step 1: Check current status
    const { rows: [task] } = await client.query(
      `SELECT id, title, status, progress, company_id, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (!task) {
      console.error(`${colors.red}❌ Task ${taskId} not found!${colors.reset}`);
      await client.query('ROLLBACK');
      return { success: false, error: 'Task not found' };
    }
    
    // If companyId was not provided, use the one from the task
    if (!companyId) {
      companyId = task.company_id;
      console.log(`${colors.yellow}Using company ID from task: ${companyId}${colors.reset}`);
    }
    
    console.log(`${colors.cyan}Initial task state:${colors.reset}`);
    console.log(`- Title: ${task.title}`);
    console.log(`- Status: ${task.status}`);
    console.log(`- Progress: ${task.progress}%`);
    console.log(`- Company ID: ${task.company_id}`);
    
    if (task.status === 'submitted') {
      console.log(`${colors.green}✅ Task is already in 'submitted' status${colors.reset}`);
      await client.query('ROLLBACK');
      return { success: true, status: 'already_submitted' };
    }
    
    // Step 2: Update the task status and metadata
    const now = new Date();
    const submissionDate = now.toISOString();
    const updatedMetadata = {
      ...task.metadata,
      submission_date: submissionDate,
      completed: true
    };
    
    await client.query(
      `UPDATE tasks 
       SET status = 'submitted', 
           progress = 100, 
           metadata = $1, 
           updated_at = NOW() 
       WHERE id = $2`,
      [updatedMetadata, taskId]
    );
    
    console.log(`${colors.green}✅ Updated task status to 'submitted'${colors.reset}`);
    
    // Step 3: Mark company KYB as completed
    if (companyId) {
      await client.query(
        `UPDATE companies 
         SET kyb_completed = true, 
             kyb_completed_at = NOW(), 
             updated_at = NOW() 
         WHERE id = $1`,
        [companyId]
      );
      
      console.log(`${colors.green}✅ Marked KYB as completed for company ${companyId}${colors.reset}`);
    }
    
    // Step 4: Get the company's available_tabs and ensure KYB tab is unlocked
    const { rows: [company] } = await client.query(
      `SELECT id, name, available_tabs FROM companies WHERE id = $1`,
      [companyId]
    );
    
    if (company) {
      let availableTabs = company.available_tabs || [];
      
      // Ensure KYB tab is unlocked
      if (!availableTabs.includes('kyb')) {
        availableTabs.push('kyb');
        
        await client.query(
          `UPDATE companies SET available_tabs = $1 WHERE id = $2`,
          [availableTabs, companyId]
        );
        
        console.log(`${colors.green}✅ Unlocked KYB tab for company ${companyId}${colors.reset}`);
      } else {
        console.log(`${colors.blue}ℹ️ KYB tab already unlocked for company ${companyId}${colors.reset}`);
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log(`${colors.green}✅ Fix completed successfully!${colors.reset}`);
    return { success: true, task, companyId };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`${colors.red}❌ Fix failed:${colors.reset}`, error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Broadcast the task update via WebSocket
 */
async function broadcastTaskUpdate(client, taskId, companyId) {
  console.log(`${colors.blue}=== Broadcasting Task Update via WebSocket ===${colors.reset}`);
  
  try {
    // Get the updated task
    const { rows: [task] } = await client.query(
      `SELECT id, title, status, progress, metadata FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    if (!task) {
      console.error(`${colors.red}❌ Task ${taskId} not found for WebSocket broadcast!${colors.reset}`);
      return { success: false, error: 'Task not found' };
    }
    
    // Create a simple HTTP server for the WebSocket
    const server = http.createServer();
    const wss = new WebSocketServer({ server, path: '/ws' });
    
    // Start the server on a random port
    server.listen(0, () => {
      const port = server.address().port;
      console.log(`${colors.blue}WebSocket server started on port ${port}${colors.reset}`);
      
      // Create the message payload
      const message = {
        type: 'task_update',
        payload: {
          taskId: parseInt(taskId),
          status: 'submitted',
          progress: 100,
          metadata: {
            transactionId: `fix-${Date.now()}`,
            submissionDate: new Date().toISOString(),
            verifiedStatus: true,
            companyId
          },
          timestamp: new Date().toISOString()
        }
      };
      
      // Broadcast to any connected clients
      wss.clients.forEach(client => {
        client.send(JSON.stringify(message));
      });
      
      console.log(`${colors.green}✅ WebSocket message sent:${colors.reset}`, message);
      
      // Close the server after a short delay
      setTimeout(() => {
        server.close();
        console.log(`${colors.blue}WebSocket server closed${colors.reset}`);
      }, 1000);
    });
    
    return { success: true };
  } catch (error) {
    console.error(`${colors.red}❌ WebSocket broadcast failed:${colors.reset}`, error);
    return { success: false, error: error.message };
  }
}

// Main function to run the fix
const runFix = async () => {
  const taskId = process.argv[2];
  const companyId = process.argv[3] ? parseInt(process.argv[3]) : null;
  
  if (!taskId) {
    console.error(`${colors.red}Usage: node direct-fix-kyb-submission.js <taskId> [<companyId>]${colors.reset}`);
    process.exit(1);
  }
  
  try {
    // Run the fix
    const result = await fixKybSubmission(taskId, companyId);
    
    if (result.success) {
      // Broadcast the task update via WebSocket if fix was successful
      if (result.status !== 'already_submitted') {
        await broadcastTaskUpdate(await pool.connect(), taskId, result.companyId);
      }
      
      console.log(`${colors.green}✅ All operations completed successfully!${colors.reset}`);
    } else {
      console.error(`${colors.red}❌ Fix failed:${colors.reset}`, result.error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
    process.exit(1);
  }
};

// Only run if this is the main module (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runFix();
}

// Export functions for use in other modules
export {
  fixKybSubmission,
  broadcastTaskUpdate
};