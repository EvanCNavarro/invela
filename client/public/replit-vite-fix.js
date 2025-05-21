/**
 * Simple Replit Preview Domain Fix for Vite
 * 
 * This script handles the "Blocked request. This host is not allowed" error
 * by making Vite accept the Replit preview domain.
 */
(function() {
  // Only run on Replit domains
  const hostname = window.location.hostname;
  if (!hostname.includes('.replit.dev') && !hostname.includes('.repl.co')) {
    return;
  }

  console.log(`[Replit Fix] Applying Vite host fix for: ${hostname}`);

  // Method 1: Tell Vite to trust this domain
  window.__vite_plugin_trusted_types_trust_domains = {
    [hostname]: true
  };

  // Method 2: Directly override Vite's host validation function
  window.__vite_host_validation_enabled = false;
  window.__vite_validate_host = function() { return true; };

  // Method 3: Support host validation for WebSockets
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    // Only modify Vite WebSocket connections
    if (typeof url === 'string' && url.includes('vite') && url.includes('localhost')) {
      // Replace with the current host
      url = url.replace(/localhost(:[0-9]+)?/, hostname);
      console.log(`[Replit Fix] Fixed WebSocket URL: ${url}`);
    }
    return new originalWebSocket(url, protocols);
  };
  
  // Copy static properties
  Object.keys(originalWebSocket).forEach(key => {
    window.WebSocket[key] = originalWebSocket[key];
  });
  
  console.log('[Replit Fix] All Vite host fixes applied successfully');
})();