/**
 * Replit Host Validation Fix
 * 
 * This script is loaded in the browser to patch the Vite HMR and WebSocket
 * connections for Replit preview domains. It allows the application to
 * work correctly when accessed through UUID-style Replit preview domains.
 * 
 * Place this in the client/public directory so it's accessible as a static file.
 */

(function() {
  console.log('[ReplitHostFix] Initializing Replit host validation fix');
  
  // Only run this script on Replit preview domains
  const host = window.location.host;
  const isReplitPreviewDomain = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(host);
  
  if (!isReplitPreviewDomain) {
    console.log('[ReplitHostFix] Not a Replit preview domain, skipping fix');
    return;
  }
  
  console.log('[ReplitHostFix] Replit preview domain detected:', host);
  
  // Create a non-blocking indicator that this is a Replit preview
  window.REPLIT_PREVIEW_DOMAIN = true;
  
  // Add a meta tag to indicate this is a Replit preview
  const meta = document.createElement('meta');
  meta.name = 'replit-preview';
  meta.content = 'true';
  document.head.appendChild(meta);
  
  // This script runs before Vite's client connects, so we can patch the WebSocket
  // constructor to intercept Vite's HMR connections
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    // Check if this is a Vite HMR WebSocket connection
    if (url && typeof url === 'string' && url.includes('vite')) {
      console.log('[ReplitHostFix] Intercepted Vite WebSocket connection:', url);
      
      // For Vite HMR connections, use a secure WebSocket protocol
      // This ensures connections work in the Replit preview environment
      const secureUrl = url.replace('ws://', 'wss://');
      console.log('[ReplitHostFix] Modified WebSocket URL:', secureUrl);
      
      return new originalWebSocket(secureUrl, protocols);
    }
    
    // For all other WebSocket connections, use the original WebSocket constructor
    return new originalWebSocket(url, protocols);
  };
  
  // Copy all properties from the original WebSocket constructor
  for (const prop in originalWebSocket) {
    if (originalWebSocket.hasOwnProperty(prop)) {
      window.WebSocket[prop] = originalWebSocket[prop];
    }
  }
  
  console.log('[ReplitHostFix] Successfully initialized Replit host validation fix');
})();