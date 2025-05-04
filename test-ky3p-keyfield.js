/**
 * Test script for KY3P field key router (keyfield-progress)
 * 
 * This script tests our new KY3P field key implementation that makes KY3P work
 * exactly like KYB forms by using string-based field_key reference instead of
 * numeric field_id references.
 */

import axios from 'axios';
import { db } from './db/index.js';
import { tasks, ky3pFields } from './db/schema.js';
import { eq } from 'drizzle-orm';

const API_URL = 'http://localhost:5000';

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌ ERROR:' :
                type === 'success' ? '✅ SUCCESS:' :
                type === 'warn' ? '⚠️ WARNING:' : 'ℹ️ INFO:';
  console.log(`${prefix} ${message}`);
}

async function findKy3pTask() {
  try {
    log('Finding a KY3P task to test with...');
    
    // Direct DB query - more reliable for testing
    const ky3pTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.task_type, 'ky3p'))
      .limit(5);
    
    if (!ky3pTasks.length) {
      log('No KY3P task found. Please create one before running this test.', 'error');
      return null;
    }
    
    // Get the first KY3P task
    const ky3pTask = ky3pTasks[0];
    
    log(`Found KY3P task: ${ky3pTask.id} - ${ky3pTask.title}`, 'success');
    return ky3pTask;
  } catch (error) {
    log(`Error finding KY3P task: ${error.message}`, 'error');
    return null;
  }
}

async function getKy3pFields() {
  try {
    log('Getting KY3P field definitions...');
    const response = await axios.get(`${API_URL}/api/ky3p/fields`);
    const fields = response.data;
    
    log(`Found ${fields.length} KY3P fields`, 'success');
    return fields;
  } catch (error) {
    log(`Error getting KY3P fields: ${error.message}`, 'error');
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
    
    log('Testing KY3P keyfield-progress endpoint...');
    log(`Updating ${Object.keys(formData).length} fields for task ${taskId}`);
    
    // Use our new keyfield-progress endpoint
    const response = await axios.post(`${API_URL}/api/ky3p/keyfield-progress`, {
      taskId,
      progress: 60, // 60% progress
      formData
    });
    
    log('Response:', 'success');
    log(JSON.stringify(response.data, null, 2), 'success');
    
    return response.data;
  } catch (error) {
    log(`Error testing keyfield-progress: ${error.message}`, 'error');
    if (error.response) {
      log('Server response:', 'error');
      log(JSON.stringify(error.response.data, null, 2), 'error');
    }
    return null;
  }
}

// Get progress data from the new endpoint
async function getKeyfieldProgress(taskId) {
  try {
    log('Getting KY3P keyfield progress...');
    const response = await axios.get(`${API_URL}/api/ky3p/keyfield-progress/${taskId}`);
    
    log('Response:', 'success');
    log(JSON.stringify(response.data, null, 2), 'success');
    
    return response.data;
  } catch (error) {
    log(`Error getting keyfield progress: ${error.message}`, 'error');
    if (error.response) {
      log('Server response:', 'error');
      log(JSON.stringify(error.response.data, null, 2), 'error');
    }
    return null;
  }
}

async function run() {
  try {
    log('Starting KY3P keyfield router test...');
    
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
    
    log('Test completed successfully!', 'success');
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    console.error(error);
  }
}

run();
