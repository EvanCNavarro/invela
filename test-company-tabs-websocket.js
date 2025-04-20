/**
 * Test file for simulating a direct database update and websocket event
 * for the file vault unlocking functionality.
 * 
 * We'll use a direct API call method instead since we're facing module 
 * resolution issues with the WebSocket service.
 */

// Using node-fetch since it works in both CJS and ESM
import fetch from 'node-fetch';

// Company IDs we want to update
const companyIds = [189, 190]; 

// Function to simulate unlocking file vault for a company
async function unlockFileVault(companyId) {
  try {
    console.log(`Simulating file vault unlock for company ID ${companyId}...`);
    
    // Make a direct API call to update the company data
    // This is simulating what the API would do for file vault unlocking
    const response = await fetch(`http://localhost:5000/api/companies/${companyId}/update-tabs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addTabs: ['file-vault'],
        sendWebSocketEvent: true, // Ask the API to send the WS event
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`API response for company ${companyId}:`, result);
    
    return result;
  } catch (error) {
    console.error(`Error unlocking file vault for company ${companyId}:`, error);
    return null;
  }
}

// Process all companies
async function main() {
  console.log('Starting file vault unlock simulation...');
  
  for (const companyId of companyIds) {
    await unlockFileVault(companyId);
  }
  
  console.log('All operations completed!');
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});