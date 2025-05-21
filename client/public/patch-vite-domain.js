/**
 * Replit Preview Domain Fix
 * 
 * This script bypasses Vite's host validation system to allow Replit preview domains.
 * It must run before the Vite client connects and performs host validation.
 */
(function() {
  // Get the current hostname
  const currentHost = window.location.hostname;
  
  // Check if we're on a Replit preview domain
  const isReplitDomain = currentHost.includes('.replit.dev') || 
                         currentHost.includes('.repl.co');
  
  if (!isReplitDomain) {
    // No need to apply the fix on non-Replit domains
    return;
  }
  
  console.log(`[Vite Fix] Applying domain fix for: ${currentHost}`);
  
  // Create a fake __vite__ global to intercept the client before it loads
  window.__vite__ = window.__vite__ || {};
  window.__vite_hostname_check = function() { return true; };
  
  // The key fix: Replace the WebSocket constructor to always allow the current host
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (typeof url === 'string' && url.includes('vite')) {
      // For Vite WebSocket connections, use the current host instead of whatever Vite tries to use
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      url = `${wsProtocol}//${window.location.host}/__vite_hmr`;
      console.log(`[Vite Fix] Redirecting WebSocket to: ${url}`);
    }
    return new OriginalWebSocket(url, protocols);
  };
  
  // Copy over the original WebSocket static properties
  for (const prop in OriginalWebSocket) {
    if (OriginalWebSocket.hasOwnProperty(prop)) {
      window.WebSocket[prop] = OriginalWebSocket[prop];
    }
  }
  
  // Add special configuration to bypass host validation
  window.__vite_plugin_trusted_types_policy__ = {
    createScriptURL: (url) => url,
    allowRuntimeEval: true
  };
  
  // Allow the current domain
  window.__vite_plugin_trusted_types_trust_domains = {
    [currentHost]: true
  };
  
  console.log('[Vite Fix] Domain validation bypass applied successfully');
})();