// Temporary fix for Vite host allowance
// This file configures Vite to accept the current Replit domain

module.exports = {
  updateViteConfig: (viteConfig) => {
    // Get the current Replit domain from the environment or use a wildcard
    const replitDomain = process.env.REPLIT_DOMAIN || 
      '9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev';
    
    // Add server configuration with allowedHosts
    return {
      ...viteConfig,
      server: {
        ...(viteConfig.server || {}),
        host: '0.0.0.0',
        hmr: {
          ...(viteConfig.server?.hmr || {}),
          clientPort: 443,
          protocol: 'wss'
        },
        cors: true,
        allowedHosts: 'all'
      }
    };
  }
};