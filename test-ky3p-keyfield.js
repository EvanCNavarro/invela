/**
 * Test script for KY3P field key router (keyfield-progress)
 * 
 * This script tests our new KY3P field key implementation that makes KY3P work
 * exactly like KYB forms by using string-based field_key reference instead of
 * numeric field_id references.
 */

const axios = require('axios');
const colors = require('./server/utils/console-colors');

const API_URL = 'http://localhost:3000';

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function findKy3pTask() {
  try {
    log('Finding a KY3P task to test with...', colors.blue);
    const response = await axios.get(`${API_URL}/api/tasks`);
    
    // Find a KY3P task
    const ky3pTask = response.data.find(task => 
      task.task_type === 'ky3p' || 
      task.task_type.includes('ky3p') || 
      task.task_type.includes('security')
    );
    
    if (!ky3pTask) {
      log('No KY3P task found. Please create one before running this test.', colors.red);
      return null;
    }
    
    log(`Found KY3P task: ${ky3pTask.id} - ${ky3pTask.title}`, colors.green);
    return ky3pTask;
  } catch (error) {
    log(`Error finding KY3P task: ${error.message}`, colors.red);
    return null;
  }
}

async function getKy3pFields() {
  try {
    log('Getting KY3P field definitions...', colors.blue);
    const response = await axios.get(`${API_URL}/api/ky3p/fields`);
    const fields = response.data;
    
    log(`Found ${fields.length} KY3P fields`, colors.green);
    return fields;
  } catch (error) {
    log(`Error getting KY3P fields: ${error.message}`, colors.red);
    return [];
  }
}

async function testKeyfieldProgress(taskId, fields) {
  try {
    // Prepare sample form data with 5 random fields
    const sampleFields = fields.slice(0, 5);
    const formData = {};
    
    for (const field of sampleFields) {
      formData[field.field_key] = `Test value for ${field.field_key}`;
    }
    
    log('Testing KY3P keyfield-progress endpoint...', colors.blue);
    log(`Updating ${Object.keys(formData).length} fields for task ${taskId}`, colors.blue);
    
    // Use our new keyfield-progress endpoint
    const response = await axios.post(`${API_URL}/api/ky3p/keyfield-progress`, {
      taskId,
      progress: 60, // 60% progress
      formData
    });
    
    log('Response:', colors.green);
    log(JSON.stringify(response.data, null, 2), colors.green);
    
    return response.data;
  } catch (error) {
    log(`Error testing keyfield-progress: ${error.message}`, colors.red);
    if (error.response) {
      log('Server response:', colors.red);
      log(JSON.stringify(error.response.data, null, 2), colors.red);
    }
    return null;
  }
}

// Get progress data from the new endpoint
async function getKeyfieldProgress(taskId) {
  try {
    log('Getting KY3P keyfield progress...', colors.blue);
    const response = await axios.get(`${API_URL}/api/ky3p/keyfield-progress/${taskId}`);
    
    log('Response:', colors.green);
    log(JSON.stringify(response.data, null, 2), colors.green);
    
    return response.data;
  } catch (error) {
    log(`Error getting keyfield progress: ${error.message}`, colors.red);
    if (error.response) {
      log('Server response:', colors.red);
      log(JSON.stringify(error.response.data, null, 2), colors.red);
    }
    return null;
  }
}

async function run() {
  try {
    log('Starting KY3P keyfield router test...', colors.cyan);
    
    // Find a KY3P task to test with
    const task = await findKy3pTask();
    if (!task) return;
    
    // Get KY3P field definitions
    const fields = await getKy3pFields();
    if (!fields.length) return;
    
    // Test updating progress using the new keyfield-progress endpoint
    const updateResult = await testKeyfieldProgress(task.id, fields);
    if (!updateResult) return;
    
    // Test getting progress data from the new endpoint
    const progressData = await getKeyfieldProgress(task.id);
    if (!progressData) return;
    
    log('Test completed successfully!', colors.cyan);
  } catch (error) {
    log(`Unexpected error: ${error.message}`, colors.red);
    console.error(error);
  }
}

run();
