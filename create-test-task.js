/**
 * Create a Test Task with 0% Progress
 * 
 * This script creates a test task with 0% progress directly in the database,
 * which allows us to test our progress calculation fix.
 */

// Check if we're in a database-enabled environment
async function createTestTask() {
  let db;
  try {
    // Try to import the database config
    const { db: database } = await import('./db/index.js');
    db = database;
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return;
  }
  
  const companyId = 256; // Use an existing company
  const userId = 298; // Use an existing user
  
  try {
    // Create an Open Banking task with 0% progress
    const taskInsertResult = await db.query(
      `INSERT INTO tasks 
      (title, description, company_id, created_by, assigned_to, status, task_type, deadline, 
       task_scope, task_template_id, progress, priority) 
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING id`,
      [
        'Test Open Banking Form', 
        'Test task for progress calculation', 
        companyId, 
        userId, 
        userId, 
        'not_started', 
        'open_banking', 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now 
        'company', 
        1, // Use a valid template ID 
        0, // Progress starts at 0% 
        'normal'
      ]
    );
    
    const taskId = taskInsertResult.rows[0].id;
    console.log(`Created test task with ID: ${taskId}`);
    
    // Return the task ID
    return taskId;
  } catch (error) {
    console.error('Failed to create test task:', error);
  }
}

// Execute the function
createTestTask().catch(console.error);
