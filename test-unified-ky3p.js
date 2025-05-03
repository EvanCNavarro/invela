/**
 * Test script for the unified KY3P update API endpoint
 * 
 * This script will:
 * 1. Find a KY3P task to test with
 * 2. Update one or more fields via the unified endpoint
 * 3. Verify that the progress is correctly updated and persisted
 */

import fetch from 'node-fetch';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Log with colors and formatting
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testUnifiedKy3pUpdate() {
  try {
    // Step 1: Find a KY3P task to test with
    log('Fetching tasks...', colors.blue);
    const tasksResponse = await fetch('http://localhost:5000/api/tasks');
    const tasks = await tasksResponse.json();
    
    // Find a KY3P task
    const ky3pTask = tasks.find(task => task.task_type === 'ky3p');
    
    if (!ky3pTask) {
      log('No KY3P task found. Creating a test task would be required.', colors.red);
      return;
    }
    
    log(`Found KY3P task: #${ky3pTask.id} - ${ky3pTask.title}`, colors.green);
    log(`Current progress: ${ky3pTask.progress}%`, colors.cyan);
    
    // Get available fields
    log('\nFetching KY3P fields...', colors.blue);
    const fieldsResponse = await fetch(`http://localhost:5000/api/ky3p/field-definitions`);
    const fields = await fieldsResponse.json();
    
    log(`Found ${fields.length} field definitions`, colors.green);
    
    // Take 5 random fields to update
    const fieldsToUpdate = fields
      .filter(field => field.field_key && field.field_key.length > 0)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
      
    log(`Selected ${fieldsToUpdate.length} fields to update:`, colors.cyan);
    fieldsToUpdate.forEach(field => {
      log(` - ${field.field_key}: ${field.label || field.display_name || field.question}`, colors.cyan);
    });
    
    // Create form data object
    const formData = {};
    fieldsToUpdate.forEach(field => {
      formData[field.field_key] = `Test value for ${field.field_key} - ${new Date().toISOString()}`;
    });
    
    // Step 2: Update fields via the unified endpoint
    log('\nUpdating fields via unified endpoint...', colors.blue);
    const updateResponse = await fetch(`http://localhost:5000/api/ky3p/unified-update/${ky3pTask.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: formData })
    });
    
    const updateResult = await updateResponse.json();
    
    if (updateResult.success) {
      log(`Successfully updated ${updateResult.processedCount} fields`, colors.green);
      log(JSON.stringify(updateResult, null, 2), colors.cyan);
    } else {
      log(`Error updating fields: ${updateResult.message}`, colors.red);
      log(JSON.stringify(updateResult, null, 2), colors.red);
      return;
    }
    
    // Step 3: Verify task progress was updated
    log('\nVerifying task progress...', colors.blue);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for progress to be calculated
    
    const updatedTaskResponse = await fetch(`http://localhost:5000/api/tasks/${ky3pTask.id}`);
    const updatedTask = await updatedTaskResponse.json();
    
    log(`Previous progress: ${ky3pTask.progress}%`, colors.yellow);
    log(`Current progress: ${updatedTask.progress}%`, colors.green);
    
    // Check if progress was persisted correctly
    if (updatedTask.progress > ky3pTask.progress) {
      log('\n✅ SUCCESS: Progress was correctly updated and persisted!', colors.bright + colors.green);
    } else if (updatedTask.progress === ky3pTask.progress) {
      log('\n⚠️ WARNING: Progress remained the same. This might be expected if the fields were already completed.', colors.yellow);
    } else {
      log('\n❌ ERROR: Progress decreased or was not updated correctly.', colors.red);
    }
    
    log(`\nFinal task state: ${updatedTask.status} - ${updatedTask.progress}%`, colors.bright + colors.blue);
  } catch (error) {
    log(`Error during test: ${error.message}`, colors.red);
    console.error(error);
  }
}

log('=== Testing Unified KY3P Update ===', colors.bright + colors.magenta);
testUnifiedKy3pUpdate().then(() => {
  log('\nTest completed.', colors.bright + colors.green);
});
