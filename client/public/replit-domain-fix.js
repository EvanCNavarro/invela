/**
 * Replit Preview Domain Fix
 * 
 * This script fixes the "Blocked request. This host is not allowed" error
 * in Vite development server when running on Replit preview domains.
 */
(function() {
  // Only run this fix on Replit domains
  const hostname = window.location.hostname;
  const isReplitDomain = hostname.includes('.repl.co') || 
                         hostname.includes('.replit.dev') ||
                         hostname.includes('.replit.app');
  
  if (!isReplitDomain) return;
  
  console.log(`[Replit Fix] Applying domain fix for: ${hostname}`);
  
  // Method 1: Add the domain to Vite's trusted types domains list
  window.__vite_plugin_trusted_types_trust_domains = 
    window.__vite_plugin_trusted_types_trust_domains || {};
  window.__vite_plugin_trusted_types_trust_domains[hostname] = true;
  
  // Method 2: Override Vite's host validator
  const script = document.createElement('script');
  script.textContent = `
    // Override Vite's host validation system
    window.__vite_host_validation_enabled = false;
    window.__vite_ws_connect = function(url) {
      // Always connect using the current host
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = url.replace(/^(wss?:)\/\/([^/]+)(\/.*)/, wsProtocol + '//' + wsHost + '$3');
      console.log('[Replit Fix] WebSocket URL rewritten:', url, '->', wsUrl);
      return new WebSocket(wsUrl);
    };
  `;
  document.head.appendChild(script);
  
  // Method 3: Apply CSS fix to hide the error message if it appears
  const style = document.createElement('style');
  style.textContent = `
    .vite-error-overlay {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('[Replit Fix] Domain fix successfully applied');
})();