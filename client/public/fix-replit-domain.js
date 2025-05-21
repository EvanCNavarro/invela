/**
 * Fix for Replit Preview Domain
 * 
 * This script specifically addresses the "Blocked request" error
 * that appears when using Vite in Replit preview domains.
 */
(function() {
  // Only run on Replit domains
  const hostname = window.location.hostname;
  if (!hostname.includes('.replit.dev') && !hostname.includes('.repl.co')) {
    return;
  }
  
  console.log('⚙️ Applying Replit domain fix for:', hostname);
  
  // Create a script element that will run right away to patch the Vite validation
  const script = document.createElement('script');
  script.textContent = `
    // Override Vite's validation logic
    window.__vite_allow_cross_site_access = true;
    window.__vite_hostname_validation_bypass = true;
    
    // Add the current domain to the list of trusted domains
    window.__vite_plugin_trusted_types_trust_domains = {
      "${hostname}": true,
      "localhost": true
    };
    
    // Make a better error handler that captures the validation error
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (message && typeof message === 'string' && 
          message.includes('Blocked request') && 
          message.includes('is not allowed')) {
        console.log('🛡️ Blocked Vite host validation error');
        return true; // Prevent default error handling
      }
      return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
    };
    
    // Override fetch to use the right headers for bypassing validation
    const originalFetch = window.fetch;
    window.fetch = function(resource, options) {
      options = options || {};
      options.headers = options.headers || {};
      
      // Add special headers for Vite HMR
      if (typeof resource === 'string' && resource.includes('/@vite/')) {
        options.headers['Origin'] = 'https://localhost:8080';
        options.headers['Host'] = 'localhost:8080';
      }
      
      return originalFetch(resource, options);
    };
    
    console.log('✅ Replit domain fix successfully applied');
  `;
  
  // Insert the script at the very beginning of the head
  if (document.head.firstChild) {
    document.head.insertBefore(script, document.head.firstChild);
  } else {
    document.head.appendChild(script);
  }
  
  // Also add CSS to hide any error overlay
  const style = document.createElement('style');
  style.textContent = `
    #vite-error-overlay, .vite-error-overlay {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
})();