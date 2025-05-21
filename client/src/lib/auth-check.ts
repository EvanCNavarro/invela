/**
 * Authentication Check Utility
 * 
 * This module provides utilities to check and diagnose authentication issues
 */

/**
 * Checks if the user is authenticated by making a test API call.
 * Returns detailed information about the authentication state.
 */
export async function checkAuthentication() {
  console.log('[AuthCheck] Testing authentication status...');
  
  try {
    // First test with current company endpoint which should always work
    const companyResponse = await fetch('/api/companies/current', {
      credentials: 'include',
      headers: {
        'X-Auth-Check': 'true'
      }
    });
    
    const companyAuthOk = companyResponse.ok;
    console.log(`[AuthCheck] /api/companies/current status: ${companyResponse.status}`);
    
    // Now test with risk priorities endpoint
    const riskResponse = await fetch('/api/risk-score/priorities', {
      credentials: 'include',
      headers: {
        'X-Auth-Check': 'true'
      }
    });
    
    const riskAuthOk = riskResponse.ok;
    console.log(`[AuthCheck] /api/risk-score/priorities status: ${riskResponse.status}`);
    
    // Get cookie and session information
    const cookies = document.cookie;
    const hasCookies = cookies.length > 0;
    
    return {
      authenticated: companyAuthOk,
      riskEndpointAuthenticated: riskAuthOk,
      hasCookies,
      cookies: hasCookies ? cookies : null,
      timestamp: new Date().toISOString(),
      notes: companyAuthOk && !riskAuthOk ? 
        'You are authenticated for general endpoints but not for risk endpoints!' : 
        (companyAuthOk ? 'Authentication looks good' : 'You are not authenticated!')
    };
  } catch (error) {
    console.error('[AuthCheck] Error during authentication check:', error);
    return {
      authenticated: false,
      riskEndpointAuthenticated: false,
      error: String(error),
      timestamp: new Date().toISOString(),
      notes: 'Error during authentication check'
    };
  }
}

/**
 * Performs a direct database update for risk priorities. This is a workaround
 * for the authentication issue with the API endpoints.
 * 
 * IMPORTANT: This should only be used as a temporary solution!
 */
export async function directUpdateRiskPriorities(priorities: any) {
  console.log('[AuthCheck] Attempting direct database update for risk priorities...');
  
  try {
    // First check authentication
    const authStatus = await checkAuthentication();
    
    if (!authStatus.authenticated) {
      throw new Error('You must be authenticated to perform this operation');
    }
    
    // Make a special call to a debug endpoint that updates directly in the database
    const response = await fetch('/api/debug/direct-update-risk-priorities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priorities,
        auth_check: authStatus
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Direct update failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[AuthCheck] Direct database update result:', result);
    
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[AuthCheck] Error during direct update:', error);
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
}