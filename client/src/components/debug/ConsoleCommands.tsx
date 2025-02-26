/**
 * Console Commands Component
 * 
 * This component injects useful debugging commands into the global window object,
 * making them accessible from the browser console.
 */

import { useEffect } from 'react';
import { AuthTestCLI } from '@/lib/test-auth-cli';
import { checkAuthState, clearAuthCookies, monitorAuthState } from '@/lib/auth-tests';
import { queryClient, queryKeys } from '@/lib/queryClient';

export function ConsoleCommands() {
  useEffect(() => {
    // Only inject these commands in development mode
    if (process.env.NODE_ENV !== 'development') return;

    // Register the auth CLI command
    (window as any).runAuthCLI = () => AuthTestCLI.run();
    
    // Register individual auth test commands
    (window as any).__debug = {
      auth: {
        checkState: checkAuthState,
        clearCookies: clearAuthCookies,
        monitorState: (duration = 60, interval = 5) => monitorAuthState(duration, interval),
        refreshSession: async () => {
          console.log('[Debug] Refreshing session...');
          try {
            await queryClient.fetchQuery({
              queryKey: queryKeys.user(),
              staleTime: 0
            });
            console.log('[Debug] Session refreshed successfully');
          } catch (error) {
            console.error('[Debug] Failed to refresh session:', error);
          }
        }
      },
      cache: {
        getUser: () => queryClient.getQueryData(queryKeys.user()),
        getCompany: () => queryClient.getQueryData(queryKeys.currentCompany()),
        clearAll: () => queryClient.clear(),
        getKeys: () => queryClient.getQueryCache().getAll().map(q => q.queryKey)
      }
    };

    // Log available commands to the console
    console.log(
      '%c[Debug] Authentication debug commands available in console:',
      'color: #2196f3; font-weight: bold'
    );
    console.log(
      '%c- runAuthCLI(): Interactive CLI tool\n' +
      '- __debug.auth.checkState(): Check current auth state\n' +
      '- __debug.auth.clearCookies(): Clear auth cookies\n' +
      '- __debug.auth.monitorState(duration, interval): Monitor auth state\n' +
      '- __debug.auth.refreshSession(): Force refresh session\n' +
      '- __debug.cache.getUser(): Get cached user data\n' +
      '- __debug.cache.getCompany(): Get cached company data\n' +
      '- __debug.cache.clearAll(): Clear entire query cache\n' +
      '- __debug.cache.getKeys(): Get all query keys',
      'color: #607d8b'
    );

    return () => {
      // Clean up by removing the commands when component unmounts
      delete (window as any).runAuthCLI;
      delete (window as any).__debug;
    };
  }, []);

  // This is a utility component that doesn't render anything
  return null;
}

export default ConsoleCommands; 