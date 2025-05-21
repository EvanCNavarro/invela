/**
 * Vite Host Validation Fix for Replit Preview
 * 
 * This script patches Vite's WebSocket connection to work with any Replit preview domain.
 * It works by hooking into the WebSocket API and patching the connection URL.
 */

(function() {
  console.log('[ViteHostFix] Starting Vite host validation fix');
  
  // Store the original WebSocket constructor
  const OriginalWebSocket = window.WebSocket;
  
  // Replace the WebSocket constructor with our patched version
  window.WebSocket = function(url, protocols) {
    // Only intercept Vite HMR WebSocket connections
    if (url && url.includes('vite') && url.includes('hmr')) {
      console.log('[ViteHostFix] Intercepting Vite HMR WebSocket connection');
      
      try {
        // Extract the port from the URL (assuming format like 'ws://localhost:3000/_vite/hmr')
        const urlObj = new URL(url);
        const port = urlObj.port || '80';
        
        // Replace the hostname while keeping the same port and path
        const currentHost = window.location.hostname;
        urlObj.hostname = currentHost;
        
        // Use the modified URL
        const newUrl = urlObj.toString();
        console.log(`[ViteHostFix] Rewriting WebSocket URL from ${url} to ${newUrl}`);
        url = newUrl;
      } catch (e) {
        console.error('[ViteHostFix] Error patching WebSocket URL:', e);
      }
    }
    
    // Call the original WebSocket constructor with our potentially modified URL
    return new OriginalWebSocket(url, protocols);
  };
  
  // Copy all static properties from the original WebSocket to our replacement
  for (const prop in OriginalWebSocket) {
    if (OriginalWebSocket.hasOwnProperty(prop)) {
      window.WebSocket[prop] = OriginalWebSocket[prop];
    }
  }
  
  // Set the prototype chain correctly
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  
  // Also patch fetch for Vite's HTTP requests
  const originalFetch = window.fetch;
  window.fetch = function(resource, options) {
    if (typeof resource === 'string' && resource.includes('/@vite/')) {
      try {
        const url = new URL(resource, window.location.origin);
        console.log(`[ViteHostFix] Intercepting Vite HTTP request: ${resource}`);
        resource = url.toString();
      } catch (e) {
        console.error('[ViteHostFix] Error patching fetch URL:', e);
      }
    }
    return originalFetch(resource, options);
  };
  
  console.log('[ViteHostFix] Vite host validation fix installed successfully');
})();