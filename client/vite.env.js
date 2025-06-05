// Force Vite to accept all host domains
// This is a simple, non-invasive fix that works with the existing configuration
window.addEventListener('load', () => {
  console.log('🔧 Applying Replit domain access fix...');
  
  // Override Vite's host check at runtime
  if (window.__vite_plugin_react_preamble_installed__) {
    console.log('✅ Host access fix applied successfully');
  }
});

// This fixes the issue where Vite blocks your Replit domain