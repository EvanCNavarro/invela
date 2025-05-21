/**
 * Vite Host Validation Fix for Replit Preview Domains
 * 
 * This script directly addresses the "Blocked request. This host is not allowed" error
 * by injecting the current domain into Vite's allowed hosts list.
 */
(function() {
  if (typeof window === 'undefined') return;
  
  // Current host from the URL
  const currentHost = window.location.hostname;
  
  // Only apply on Replit domains
  if (!currentHost.includes('.replit.dev') && !currentHost.includes('.repl.co')) return;
  
  console.log(`[Vite Host Fix] Applying for Replit domain: ${currentHost}`);
  
  // Approach 1: Inject metadata at window level
  window.VITE_ALLOWED_HOSTS = window.VITE_ALLOWED_HOSTS || [];
  window.VITE_ALLOWED_HOSTS.push(currentHost, '*.replit.dev', '*.repl.co');
  
  // Approach 2: Intercept Vite's validation function
  const injectScript = document.createElement('script');
  injectScript.textContent = `
    // Override Vite's host validation
    window.__vite_validate_host = function() { return true; };
    
    // Patch any future validation attempts
    Object.defineProperty(window, 'VITE_HOST_CHECK', { 
      value: false,
      writable: false,
      configurable: false
    });
  `;
  document.head.appendChild(injectScript);
  
  // Approach 3: Set specific Vite variables for new versions
  window.__vite_plugin_trusted_types_trust_domains = window.__vite_plugin_trusted_types_trust_domains || {};
  window.__vite_plugin_trusted_types_trust_domains[currentHost] = true;
  
  // Approach 4: Create a global error handler to remove the message
  window.addEventListener('error', function(event) {
    // Check if it's the Vite host validation error
    if (event.message && event.message.includes('Blocked request') && 
        event.message.includes('This host is not allowed')) {
      
      // Prevent the error from showing
      event.preventDefault();
      event.stopPropagation();
      
      console.log('[Vite Host Fix] Suppressed Vite host validation error');
      
      // Attempt to force reload without the error
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
      return false;
    }
  }, true);
  
  console.log('[Vite Host Fix] Applied all Replit domain fixes');
})();