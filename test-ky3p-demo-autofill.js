/**
 * Test script for KY3P demo auto-fill functionality
 * 
 * This script:
 * 1. Fetches demo data from the server
 * 2. Converts the data to the format expected by the bulk update endpoint
 * 3. Logs the data to verify correct formatting
 * 
 * Run this script to test the data flow before implementing a fix
 */

import fetch from 'node-fetch';

async function getKy3pFields() {
  try {
    const response = await fetch('http://localhost:5000/api/ky3p-fields', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Failed to get KY3P fields:', response.status, response.statusText);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching KY3P fields:', error);
    return [];
  }
}

async function getDemoData(taskId) {
  try {
    const response = await fetch(`http://localhost:5000/api/ky3p/demo-autofill/${taskId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Failed to get demo data:', response.status, response.statusText);
      return {};
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching demo data:', error);
    return {};
  }
}

async function testConversion(taskId) {
  // Get all fields to create the mapping
  console.log(`Fetching KY3P fields...`);
  const fields = await getKy3pFields();
  
  if (!fields.length) {
    console.error('No KY3P fields found');
    return;
  }
  
  console.log(`Got ${fields.length} fields`);
  
  // Create mapping from field keys to IDs
  const fieldKeyToIdMap = new Map();
  for (const field of fields) {
    fieldKeyToIdMap.set(field.field_key, field.id);
  }
  
  // Get demo data
  console.log(`Fetching demo data for task ${taskId}...`);
  const demoData = await getDemoData(taskId);
  
  if (!Object.keys(demoData).length) {
    console.error('No demo data found');
    return;
  }
  
  console.log(`Got demo data with ${Object.keys(demoData).length} fields`);
  
  // Convert to array format
  const responsesArray = [];
  let validCount = 0;
  let invalidCount = 0;
  
  for (const [key, value] of Object.entries(demoData)) {
    const fieldId = fieldKeyToIdMap.get(key);
    
    if (fieldId !== undefined) {
      const numericFieldId = Number(fieldId);
      
      if (!isNaN(numericFieldId)) {
        responsesArray.push({
          fieldId: numericFieldId,
          value
        });
        validCount++;
      } else {
        console.warn(`Invalid field ID for key ${key}: ${fieldId}`);
        invalidCount++;
      }
    } else {
      console.warn(`Field key not found: ${key}`);
      invalidCount++;
    }
  }
  
  console.log(`Converted ${validCount} fields to array format (${invalidCount} invalid/not found)`);
  console.log('First 5 converted responses:');
  console.log(JSON.stringify(responsesArray.slice(0, 5), null, 2));
  
  return {
    demoData,
    responsesArray
  };
}

// Provide a task ID when running the script
const taskId = process.argv[2] || 613;
testConversion(taskId)
  .then(() => console.log('Test complete'))
  .catch(error => console.error('Test failed:', error));