/**
 * Global declarations for TypeScript
 * 
 * This file contains declarations for global variables and interfaces that are
 * used throughout the application, helping TypeScript understand custom properties
 * added to global objects.
 */

// Extend the Window interface to include custom properties we use for auth/context
interface Window {
  // User context globals
  __USER_ID?: number;
  __COMPANY_ID?: number;
  
  // For TanStack Query dev tools
  __TanStackQueryClient?: any;
}
