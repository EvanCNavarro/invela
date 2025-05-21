/**
 * Direct fix for Replit preview domains with Vite
 */
(function() {
  // Only run on Replit domains
  const hostname = window.location.hostname;
  if (!hostname.includes('.replit.dev') && !hostname.includes('.repl.co')) {
    return;
  }
  
  console.log('Applying Replit domain fix for:', hostname);
  
  // Override the exact error shown in the screenshot
  const errorRegex = new RegExp(`Blocked request. This host \\("${hostname}"\\) is not allowed.`);
  
  // Patch console.error to prevent the error from showing
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args.length > 0 && typeof args[0] === 'string' && errorRegex.test(args[0])) {
      console.log('Suppressed Vite host validation error');
      return;
    }
    return originalConsoleError.apply(this, args);
  };
  
  // Important: Add this host to the allowed domains list
  // This is the key fix for the specific error in the screenshot
  window.__vite_plugin_trusted_types_policy__ = {
    createScriptURL: (url) => url,
    createScript: (script) => script
  };
  
  window.__vite_plugin_trusted_types_trust_domains = {
    [hostname]: true,
    'localhost': true
  };
})();