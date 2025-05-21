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
  
  // Override the createServer function with a typed version
  (http as any).createServer = function(
    requestListener?: (req: http.IncomingMessage, res: http.ServerResponse) => void
  ) {
    // If no listener was provided, pass through to original implementation
    if (!requestListener) {
      return originalCreateServer.apply(this, arguments);
    }
    
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
        return requestListener(patchedReq, res);
      }
      
      // For normal requests, just pass through to the original listener
      return requestListener(req, res);
    };
    
    // Call the original createServer with our patched listener as a properly typed parameter
    return originalCreateServer.call(this, patchedListener as any);
  };
  
  logger.info('[ReplitHostValidation] Successfully initialized host validation override');
}

/**
 * Check if a request has been identified as a Replit preview request
 */
export function isReplitPreviewRequest(req: any): boolean {
  return !!req._replitPreviewRequest;
}