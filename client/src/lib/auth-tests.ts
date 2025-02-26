/**
 * Authentication Testing Utilities
 * 
 * This file contains utilities for testing authentication flows in the application.
 * It helps diagnose issues with login, session persistence, and logout.
 */

import { queryClient, queryKeys } from './queryClient';

/**
 * Extract and parse all cookies from the document
 */
export function getCookies(): Record<string, string> {
  const cookies: Record<string, string> = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name) cookies[name] = value;
  });
  return cookies;
}

/**
 * Decode a JWT token without external dependencies
 */
export function decodeJwtPayload(token: string): any {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT:', e);
    return { error: 'Invalid token format' };
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return true;
    
    // Check if the expiration time (in seconds) is in the past
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    console.error('Error checking token expiration:', e);
    return true; // Assume expired on error
  }
}

/**
 * Run a comprehensive authentication state check
 */
export function checkAuthState(): AuthStateResult {
  const cookies = getCookies();
  const sessionId = cookies['sid'];
  const refreshToken = cookies['refresh_token'];
  
  // Get query cache state
  const userQueryState = queryClient.getQueryState(queryKeys.user());
  const companyQueryState = queryClient.getQueryState(queryKeys.currentCompany());
  
  // Get timestamps for debugging
  const now = Date.now();
  const timestamp = new Date().toISOString();
  
  const tokenPayload = sessionId ? decodeJwtPayload(sessionId) : null;
  const tokenExpiration = tokenPayload?.exp ? new Date(tokenPayload.exp * 1000) : null;
  const tokenIssuedAt = tokenPayload?.iat ? new Date(tokenPayload.iat * 1000) : null;
  
  // Calculate if token is about to expire (within 5 minutes)
  const isAboutToExpire = tokenExpiration 
    ? (tokenExpiration.getTime() - now) < 5 * 60 * 1000
    : false;
  
  // Determine overall auth state
  const isFullyAuthenticated = !!sessionId && !!refreshToken && !!userQueryState?.data;
  
  return {
    status: isFullyAuthenticated ? 'authenticated' : (sessionId ? 'partial' : 'unauthenticated'),
    cookies: {
      hasSid: !!sessionId,
      hasRefreshToken: !!refreshToken
    },
    token: {
      isValid: !!tokenPayload && !isTokenExpired(sessionId),
      isExpired: tokenPayload ? isTokenExpired(sessionId) : null,
      isAboutToExpire,
      expiresAt: tokenExpiration ? tokenExpiration.toISOString() : null,
      issuedAt: tokenIssuedAt ? tokenIssuedAt.toISOString() : null,
      payload: tokenPayload
    },
    cache: {
      userCached: !!userQueryState?.data,
      companyCached: !!companyQueryState?.data,
      userQueryStatus: userQueryState?.status || 'unknown',
      companyQueryStatus: companyQueryState?.status || 'unknown'
    },
    timestamp
  };
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies(): void {
  document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  console.log('[Auth Test] 🗑️ Auth cookies cleared manually');
}

/**
 * Run a full authentication flow test
 * This function returns a Promise that resolves with test results
 */
export async function runAuthTest(): Promise<AuthTestResults> {
  console.log('[Auth Test] 🧪 Starting comprehensive auth test');
  const startTime = Date.now();
  const results: AuthTestResults = {
    initialState: checkAuthState(),
    loginState: null,
    refreshState: null,
    logoutState: null,
    passed: false,
    errors: [],
    timestamp: new Date().toISOString()
  };
  
  // Record initial state
  console.log('[Auth Test] Initial auth state:', results.initialState);
  
  try {
    // Test 1: Check if already logged in
    if (results.initialState.status === 'authenticated') {
      console.log('[Auth Test] ✅ Already authenticated, testing session refresh');
      
      // Test session refresh
      try {
        const userData = await queryClient.fetchQuery({
          queryKey: queryKeys.user(),
          staleTime: 0
        });
        
        results.refreshState = checkAuthState();
        console.log('[Auth Test] ✅ Session refresh successful', userData);
      } catch (error) {
        console.error('[Auth Test] ❌ Session refresh failed:', error);
        results.errors.push(`Session refresh failed: ${error instanceof Error ? error.message : String(error)}`);
        results.refreshState = checkAuthState();
      }
    } else {
      console.log('[Auth Test] 🔄 Not authenticated, skipping refresh test');
    }
    
    // Test 2: Check caching in query client
    const cachedUser = queryClient.getQueryData(queryKeys.user());
    if (cachedUser) {
      console.log('[Auth Test] ✅ User data is cached in query client', cachedUser);
    } else {
      console.log('[Auth Test] ⚠️ User data is not cached in query client');
      if (results.initialState.status === 'authenticated') {
        results.errors.push('User authenticated but data not found in query cache');
      }
    }
    
    // Final results determination
    results.passed = results.errors.length === 0;
    
    console.log('[Auth Test] 🏁 Test completed in', Date.now() - startTime, 'ms');
    console.log('[Auth Test] Status:', results.passed ? '✅ PASSED' : '❌ FAILED');
    if (results.errors.length > 0) {
      console.log('[Auth Test] Errors:', results.errors);
    }
    
    return results;
  } catch (error) {
    console.error('[Auth Test] ❌ Fatal test error:', error);
    results.errors.push(`Fatal test error: ${error instanceof Error ? error.message : String(error)}`);
    results.passed = false;
    return results;
  }
}

/**
 * Track auth state changes over time
 * 
 * @param duration Duration in seconds to track (default: 60)
 * @param interval Interval in seconds between checks (default: 5)
 * @returns Function to stop monitoring
 */
export function monitorAuthState(
  duration: number = 60,
  interval: number = 5,
  callback?: (state: AuthStateResult) => void
): () => void {
  console.log(`[Auth Monitor] 🔍 Starting auth state monitoring for ${duration}s (interval: ${interval}s)`);
  
  const states: AuthStateResult[] = [];
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  // Initial check
  const initialState = checkAuthState();
  states.push(initialState);
  console.log('[Auth Monitor] Initial state:', initialState);
  if (callback) callback(initialState);
  
  // Set up interval for checking
  const intervalId = setInterval(() => {
    const now = Date.now();
    const state = checkAuthState();
    states.push(state);
    
    // Check for changes from previous state
    const prevState = states[states.length - 2];
    const changes: string[] = [];
    
    if (prevState.status !== state.status) {
      changes.push(`Status changed: ${prevState.status} → ${state.status}`);
    }
    if (prevState.cookies.hasSid !== state.cookies.hasSid) {
      changes.push(`Session token ${state.cookies.hasSid ? 'added' : 'removed'}`);
    }
    if (prevState.cookies.hasRefreshToken !== state.cookies.hasRefreshToken) {
      changes.push(`Refresh token ${state.cookies.hasRefreshToken ? 'added' : 'removed'}`);
    }
    
    if (changes.length > 0) {
      console.log(`[Auth Monitor] ⚠️ Changes detected at ${Math.floor((now - startTime) / 1000)}s:`, changes);
    } else {
      console.log(`[Auth Monitor] State check at ${Math.floor((now - startTime) / 1000)}s: No changes`);
    }
    
    if (callback) callback(state);
    
    // Stop if duration exceeded
    if (now >= endTime) {
      clearInterval(intervalId);
      console.log('[Auth Monitor] 🏁 Monitoring completed. Collected', states.length, 'state snapshots');
    }
  }, interval * 1000);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('[Auth Monitor] ⏹️ Monitoring stopped manually');
  };
}

// Types for auth testing

export interface AuthStateResult {
  status: 'authenticated' | 'partial' | 'unauthenticated';
  cookies: {
    hasSid: boolean;
    hasRefreshToken: boolean;
  };
  token: {
    isValid: boolean;
    isExpired: boolean | null;
    isAboutToExpire: boolean;
    expiresAt: string | null;
    issuedAt: string | null;
    payload: any;
  };
  cache: {
    userCached: boolean;
    companyCached: boolean;
    userQueryStatus: string;
    companyQueryStatus: string;
  };
  timestamp: string;
}

export interface AuthTestResults {
  initialState: AuthStateResult;
  loginState: AuthStateResult | null;
  refreshState: AuthStateResult | null;
  logoutState: AuthStateResult | null;
  passed: boolean;
  errors: string[];
  timestamp: string;
} 