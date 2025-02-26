/**
 * Debug Hook
 * 
 * This hook provides centralized access to debugging utilities throughout the app.
 * It automatically disables most functionality in production for security.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { checkAuthState, clearAuthCookies } from '@/lib/auth-tests';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { AuthTestCLI } from '@/lib/test-auth-cli';
import { useQuery } from '@tanstack/react-query';

// Define types for auth status response
interface AuthStatusResponse {
  isAuthenticated: boolean;
  hasSessionCookie: boolean;
  hasRefreshToken: boolean;
  sessionID?: string;
}

export function useDebug() {
  const [, navigate] = useLocation();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const [isDebugMode, setIsDebugMode] = useState(
    process.env.NODE_ENV !== 'production' || localStorage.getItem('debug_mode') === 'true'
  );
  
  // Define toggleDebugMode callback
  const toggleDebugMode = useCallback(() => {
    const newMode = !isDebugMode;
    setIsDebugMode(newMode);
    localStorage.setItem('debug_mode', String(newMode));
    return newMode;
  }, [isDebugMode]);
  
  // Enable debug mode in window for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__debug = {
        ...(window.__debug || {}),
        toggleDebugMode: () => {
          const newMode = !isDebugMode;
          setIsDebugMode(newMode);
          localStorage.setItem('debug_mode', String(newMode));
          return `Debug mode ${newMode ? 'enabled' : 'disabled'}`;
        },
        isDebugMode: () => isDebugMode,
      };
    }
  }, [isDebugMode]);
  
  // Query for auth status from server
  const { data: authStatus, refetch: refetchAuthStatus } = useQuery<AuthStatusResponse>({
    queryKey: ['debug', 'auth-status'],
    queryFn: async () => {
      const response = await fetch('/api/debug/auth-status');
      if (!response.ok) {
        throw new Error('Failed to fetch auth status');
      }
      return response.json();
    },
    // Only run in debug mode
    enabled: isDebugMode,
    // Refresh frequently in development
    refetchInterval: process.env.NODE_ENV !== 'production' ? 5000 : false,
  });
  
  // Check auth status immediately
  const checkAuthStatus = useCallback(() => {
    return refetchAuthStatus();
  }, [refetchAuthStatus]);
  
  // Simulate cookie extraction for auth debugging
  const getCookies = useCallback(() => {
    const cookies: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) cookies[name] = value || '';
    });
    return cookies;
  }, []);
  
  // Get authentication state for debugging
  const getAuthState = useCallback(() => {
    if (!isDevelopment) return { safe: 'Auth info not available in production' };
    return checkAuthState();
  }, [isDevelopment]);
  
  // Get query cache information
  const getQueryCache = useCallback(() => {
    if (!isDevelopment) return { safe: 'Cache info not available in production' };
    
    const userQuery = queryClient.getQueryState(queryKeys.user());
    const companyQuery = queryClient.getQueryState(queryKeys.currentCompany());
    
    return {
      userQuery: {
        status: userQuery?.status,
        dataUpdatedAt: userQuery?.dataUpdatedAt ? new Date(userQuery.dataUpdatedAt).toISOString() : null,
        isFetching: userQuery?.fetchStatus === 'fetching'
      },
      companyQuery: {
        status: companyQuery?.status,
        dataUpdatedAt: companyQuery?.dataUpdatedAt ? new Date(companyQuery.dataUpdatedAt).toISOString() : null,
        isFetching: companyQuery?.fetchStatus === 'fetching'
      },
      cacheEntries: queryClient.getQueryCache().getAll().length
    };
  }, [isDevelopment]);
  
  // Run CLI utility
  const runAuthCLI = useCallback(() => {
    if (!isDevelopment) {
      console.warn('Auth CLI not available in production');
      return;
    }
    
    AuthTestCLI.run();
  }, [isDevelopment]);
  
  // Force refresh of auth state
  const refreshAuthState = useCallback(async () => {
    if (!isDevelopment) {
      console.warn('Auth refresh not available in production');
      return;
    }
    
    try {
      const userData = await queryClient.fetchQuery({
        queryKey: queryKeys.user(),
        staleTime: 0
      });
      
      console.log('[Debug] User data refreshed:', userData);
      
      const companyData = await queryClient.fetchQuery({
        queryKey: queryKeys.currentCompany(),
        staleTime: 0
      });
      
      console.log('[Debug] Company data refreshed:', companyData);
      
      return { success: true, user: userData, company: companyData };
    } catch (error) {
      console.error('[Debug] Auth refresh failed:', error);
      return { success: false, error };
    }
  }, [isDevelopment]);
  
  // Navigate to the auth test page
  const goToAuthTestPage = useCallback(() => {
    navigate('/auth-test');
  }, [navigate]);
  
  // Clear auth cookies for testing
  const clearAuth = useCallback(() => {
    if (!isDevelopment) {
      console.warn('Auth clear not available in production');
      return;
    }
    
    clearAuthCookies();
    console.log('[Debug] Auth cookies cleared');
    return getAuthState();
  }, [isDevelopment, getAuthState]);
  
  // Memoize debug utilities to prevent unnecessary re-renders
  const debugUtils = useMemo(() => ({
    getAuthState,
    getQueryCache,
    runAuthCLI,
    refreshAuthState,
    goToAuthTestPage,
    clearAuth,
    getCookies,
    isDevelopment,
    isDebugMode,
    toggleDebugMode,
    authStatus,
    checkAuthStatus,
  }), [
    getAuthState,
    getQueryCache,
    runAuthCLI,
    refreshAuthState,
    goToAuthTestPage,
    clearAuth,
    getCookies,
    isDevelopment,
    isDebugMode,
    toggleDebugMode,
    authStatus,
    checkAuthStatus
  ]);
  
  return debugUtils;
}

// Add this for TypeScript global window object extension
declare global {
  interface Window {
    __debug?: {
      toggleDebugMode: () => string;
      isDebugMode: () => boolean;
      [key: string]: any;
    };
  }
}

export default useDebug; 