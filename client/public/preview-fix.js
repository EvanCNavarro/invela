/**
 * Replit Preview Domain Fix
 * 
 * This script fixes Vite's host validation issues with Replit UUID-style preview domains.
 * It patches the Vite client to accept any hostname during development.
 */

(function() {
  console.log('[ReplitPreviewFix] Initializing...');

  // Only run on Replit preview domains
  const isPreviewDomain = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(location.host);
  
  if (!isPreviewDomain) {
    console.log('[ReplitPreviewFix] Not a preview domain, skipping fix');
    return;
  }

  console.log('[ReplitPreviewFix] Running on Replit preview domain:', location.host);

  // Create a proxy for WebSocket to bypass host validation
  const originalWebSocket = window.WebSocket;
  
  // Replace the WebSocket constructor with our patched version
  window.WebSocket = function(url, protocols) {
    console.log('[ReplitPreviewFix] Intercepting WebSocket connection:', url);
    
    // Transform the URL to use the current host instead of the one Vite is trying to use
    if (url.includes('vite') && url.includes('ws')) {
      const currentHost = location.host;
      const urlObj = new URL(url.startsWith('ws') ? url : `ws://${currentHost}${url.startsWith('/') ? url : `/${url}`}`);
      
      // Update the URL to use the current host
      urlObj.host = currentHost;
      
      console.log('[ReplitPreviewFix] Redirecting WebSocket to:', urlObj.toString());
      url = urlObj.toString();
    }
    
    return new originalWebSocket(url, protocols);
  };
  
  // Copy over any static properties/methods
  for (const prop in originalWebSocket) {
    if (originalWebSocket.hasOwnProperty(prop)) {
      window.WebSocket[prop] = originalWebSocket[prop];
    }
  }
  
  // Also patch fetch for HTTP requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('/@vite/')) {
      console.log('[ReplitPreviewFix] Intercepting Vite fetch:', url);
      
      // Make sure the URL uses the current host
      const currentHost = location.host;
      const urlObj = new URL(url, location.origin);
      urlObj.host = currentHost;
      
      console.log('[ReplitPreviewFix] Redirecting fetch to:', urlObj.toString());
      url = urlObj.toString();
    }
    
    return originalFetch(url, options);
  };
  
  console.log('[ReplitPreviewFix] Initialization complete');
})();