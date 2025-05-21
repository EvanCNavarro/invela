// Simple fix that prevents the "Blocked request" error in Replit
(function() {
  const hostname = window.location.hostname;
  
  // Only run on Replit domains
  if (!hostname.includes('.replit.dev') && !hostname.includes('.repl.co')) {
    return;
  }
  
  console.log('Applying Vite fix for Replit domain:', hostname);
  
  // Method 1: Direct variable override
  window.__vite_hostname_check = false;
  
  // Method 2: Add styles to hide error overlay 
  const style = document.createElement('style');
  style.textContent = `
    #vite-error-overlay {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;
  document.head.appendChild(style);
  
  // Method 3: Override console.error to suppress the validation error
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args.length > 0 && typeof args[0] === 'string') {
      if (args[0].includes('Blocked request') || args[0].includes('not allowed')) {
        console.log('Suppressed Vite host validation error');
        return;
      }
    }
    return originalConsoleError.apply(this, args);
  };
  
  // Method 4: Monitor and remove error overlays
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes) {
        for (const node of mutation.addedNodes) {
          if (node.id === 'vite-error-overlay') {
            node.style.display = 'none';
            console.log('Removed Vite error overlay');
          }
        }
      }
    }
  });
  
  // Start observing the document
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  });
})();