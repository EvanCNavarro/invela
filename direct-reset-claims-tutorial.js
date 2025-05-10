/**
 * Direct script to reset the claims tab tutorial
 * 
 * This script uses the API to reset the claims tab tutorial status for the current user
 */
import fetch from 'node-fetch';
import { readFileSync } from 'fs';

// Get session cookie from the session-cookie file
const sessionCookie = readFileSync('.session-cookie', 'utf-8').trim();

// Base URL for API calls
const BASE_URL = 'http://localhost:3000/api';

// Function to make authenticated API requests
async function makeApiRequest(url, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return response.json();
}

// Reset the claims tab tutorial
async function resetClaimsTutorial() {
  console.log('Resetting claims tab tutorial...');
  
  try {
    // First, get the current user ID
    const userData = await makeApiRequest(`${BASE_URL}/auth/me`);
    const userId = userData.id || 8; // Default to 8 if not found
    
    console.log(`Current user ID: ${userId}`);
    
    // Now update the tutorial status using the API
    const updateData = {
      tabName: 'claims',
      currentStep: 0,
      completed: false
    };
    
    const result = await makeApiRequest(`${BASE_URL}/user-tab-tutorials`, 'POST', updateData);
    console.log('Tutorial reset result:', result);
    
    // Now mark the tutorial as seen to ensure it's activated
    const seenResult = await makeApiRequest(`${BASE_URL}/user-tab-tutorials/mark-seen`, 'POST', {
      tabName: 'claims'
    });
    
    console.log('Mark as seen result:', seenResult);
    
    console.log('Tutorial reset successful!');
  } catch (error) {
    console.error('Error resetting tutorial:', error);
  }
}

// Run the reset function
resetClaimsTutorial();