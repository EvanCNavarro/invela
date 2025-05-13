/**
 * Claims Tutorial Status Check
 * 
 * This script can be run directly in the browser console to check if
 * the claims tutorial database entry is properly accessible via the API.
 */

// Test the tutorial status API directly
async function checkClaimsTutorialStatus() {
  try {
    console.log('[ClaimsTest] Checking claims tutorial status via API...');
    
    // Make the API request
    const response = await fetch('/api/user-tab-tutorials/claims/status');
    const data = await response.json();
    
    console.log('[ClaimsTest] API Response:', {
      status: response.status,
      data
    });
    
    // If tutorial exists and is not completed, it should display
    if (data.exists && !data.completed) {
      console.log('[ClaimsTest] ✅ Tutorial should display! It exists and is not completed.');
    } else if (!data.exists) {
      console.log('[ClaimsTest] ❌ Tutorial not found in database.');
    } else if (data.completed) {
      console.log('[ClaimsTest] ❌ Tutorial is marked as completed and will not display.');
    }
    
    return data;
  } catch (error) {
    console.error('[ClaimsTest] Error checking claims tutorial:', error);
    return null;
  }
}

// Execute the test
checkClaimsTutorialStatus();