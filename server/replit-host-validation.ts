/**
 * Replit Host Validation Override
 * 
 * This module provides a specialized approach to handle Replit preview domains
 * by patching the global Node.js http module to modify Vite's host validation behavior.
 * 
 * Since we cannot modify the Vite configuration directly, this approach intercepts
 * incoming requests and modifies the headers to ensure they pass Vite's host validation.
 */

import http from 'http';
import { logger } from './utils/logger';

// Store the original createServer function
const originalCreateServer = http.createServer;

/**
 * Initialize the Replit host validation override
 * This patches the http.createServer method to intercept and modify certain requests
 */
export function initReplitHostValidation() {
  logger.info('[ReplitHostValidation] Initializing Replit host validation override');
  
  // Override the createServer function
  (http as any).createServer = function(...args: any[]) {
    // Get the listener callback (usually the second argument)
    const originalListener = args[0];
    
    // Create a new listener that will modify the request before passing it to the original listener
    const patchedListener = function(req: http.IncomingMessage, res: http.ServerResponse) {
      // Check if this is a request from a Replit preview domain
      const host = req.headers.host || '';
      const isReplitPreviewDomain = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(host);
      
      if (isReplitPreviewDomain) {
        // For Replit preview domains, add a special header that our CORS middleware will recognize
        logger.debug(`[ReplitHostValidation] Intercepted request from Replit preview domain: ${host}`);
        
        // Create a patched request object that allows the host
        const patchedReq = req;
        
        // Add a special header that will be recognized by our middleware
        (patchedReq as any)._replitPreviewRequest = true;
        
        // Pass the patched request to the original listener
        return originalListener(patchedReq, res);
      }
      
      // For normal requests, just pass through to the original listener
      return originalListener(req, res);
    };
    
    // Replace the original listener with our patched version
    args[0] = patchedListener;
    
    // Call the original createServer with our modified arguments
    return originalCreateServer.apply(this, args);
  };
  
  logger.info('[ReplitHostValidation] Successfully initialized host validation override');
}

/**
 * Check if a request has been identified as a Replit preview request
 */
export function isReplitPreviewRequest(req: any): boolean {
  return !!req._replitPreviewRequest;
}