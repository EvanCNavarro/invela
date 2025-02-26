// At the top of the file, before any other code
// Suppress auth check errors to avoid console clutter
// Only apply in browser environments
if (typeof window !== 'undefined' && window.console) {
  const originalConsoleError = console.error;
  console.error = function filterConsoleErrors(...args) {
    // Convert arguments to a string for easier filtering
    const errorString = args.join(' ');
    
    // Common 401 error patterns to filter out
    const authErrorPatterns = [
      '/api/user 401',
      'Failed to load resource: the server responded with a status of 401',
      'Error: Request failed with status code 401',
      '[TanStack Query]'
    ];
    
    // Check if this is an auth-related error we want to suppress
    if (authErrorPatterns.some(pattern => errorString.includes(pattern)) &&
        errorString.includes('/api/user')) {
      // Skip logging this error
      return;
    }
    
    // Pass through all other errors to the original console.error
    originalConsoleError.apply(console, args);
  };
}

// ... existing code ... 