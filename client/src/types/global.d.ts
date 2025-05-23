/**
 * ========================================
 * Global TypeScript Declarations
 * ========================================
 * 
 * Global type declarations and interface extensions for the enterprise
 * risk assessment platform. Provides TypeScript support for custom
 * window properties and global variables used throughout the application.
 * 
 * @module types/global
 * @version 1.0.0
 * @since 2025-05-23
 */

// Extend the Window interface to include custom properties we use for auth/context
interface Window {
  // User context globals
  __USER_ID?: number;
  __COMPANY_ID?: number;
  
  // For TanStack Query dev tools
  __TanStackQueryClient?: any;
}
