/**
 * Direct Risk Score Update
 * 
 * This utility provides functions to update risk score configuration directly
 * via debug endpoints when the regular API endpoints have authentication issues.
 */

import { RiskPriorities } from './risk-score-configuration-types';

/**
 * Check if the user is authenticated for risk score endpoints
 */
export async function checkAuthentication(): Promise<{ 
  authenticated: boolean; 
  riskEndpointAuthenticated: boolean;
  user: { id: number; company_id: number } | null;
  timestamp: string;
}> {
  try {
    // Call the debug auth-check endpoint
    const response = await fetch('/api/debug/auth-check');
    
    if (!response.ok) {
      console.error('[AuthCheck] Auth check request failed:', response.status, response.statusText);
      return {
        authenticated: false,
        riskEndpointAuthenticated: false,
        user: null,
        timestamp: new Date().toISOString()
      };
    }
    
    const result = await response.json();
    console.log('[AuthCheck] Auth check result:', result);
    
    return {
      authenticated: result.authenticated === true,
      riskEndpointAuthenticated: result.authenticated === true,
      user: result.user,
      timestamp: result.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('[AuthCheck] Error checking authentication:', error);
    
    return {
      authenticated: false,
      riskEndpointAuthenticated: false,
      user: null,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Directly update risk priorities through debug endpoint
 */
export async function directUpdateRiskPriorities(priorities: RiskPriorities): Promise<{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  timestamp: string;
}> {
  try {
    // Get auth status first to include in debug request
    const authCheck = await checkAuthentication();
    
    // Call the direct update endpoint
    const response = await fetch('/api/debug/direct-update-risk-priorities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priorities,
        auth_check: authCheck, // Include auth info for diagnostics
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DirectUpdate] Request failed:', response.status, errorText);
      
      return {
        success: false,
        error: `Request failed: ${response.status} ${response.statusText}`,
        timestamp: new Date().toISOString()
      };
    }
    
    const result = await response.json();
    console.log('[DirectUpdate] Direct update succeeded:', result);
    
    return {
      success: true,
      data: result.data,
      message: result.message,
      timestamp: result.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('[DirectUpdate] Error during direct update:', error);
    
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
}
