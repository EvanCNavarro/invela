/**
 * Emergency File Vault API Unlock
 * 
 * This script calls our emergency endpoint to force unlock the file vault
 * tab for company ID 204 (or other specified ID)
 */

// Get company ID from command line or default to 204
const COMPANY_ID = process.argv[2] || 204;

async function unlockFileVault() {
  try {
    console.log(`[API UNLOCK] Unlocking file vault for company ${COMPANY_ID}...`);
    
    // Call our emergency endpoint
    const response = await fetch(`http://localhost:5000/api/emergency/unlock-file-vault/${COMPANY_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Parse the response
    const data = await response.json();
    
    // Show results
    console.log(`[API UNLOCK] API response (${response.status}):`, data);
    
    if (response.ok) {
      console.log(`[API UNLOCK] File vault unlocked successfully for company ${COMPANY_ID}`);
      console.log(`[API UNLOCK] Available tabs: ${data.company.available_tabs.join(', ')}`);
      return true;
    } else {
      console.error(`[API UNLOCK] Failed to unlock file vault: ${data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`[API UNLOCK] Error:`, error);
    return false;
  }
}

// Execute the script
unlockFileVault()
  .then(success => {
    console.log(`[API UNLOCK] Operation ${success ? 'succeeded' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`[API UNLOCK] Unhandled error:`, error);
    process.exit(1);
  });