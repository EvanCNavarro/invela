/**
 * Deployment Helpers
 * 
 * This file contains utility functions to assist with deployment-specific configurations
 */

/**
 * Get the correct port configuration based on environment and available variables
 * 
 * In production, this will prioritize the PORT environment variable or use 80 as default (standard HTTP port)
 * In development, it will use 5000 as the default fallback
 */
export function getDeploymentPort(): number {
  const isProduction = process.env.NODE_ENV === 'production';
  const envPort = process.env.PORT;
  
  if (envPort) {
    const parsedPort = parseInt(envPort, 10);
    return isNaN(parsedPort) ? (isProduction ? 80 : 5000) : parsedPort;
  }
  
  return isProduction ? 80 : 5000;
}

/**
 * Get the host interface to bind to:
 * 
 * In Replit, we always bind to '0.0.0.0' (all interfaces) to ensure the server
 * is accessible from any source including the Replit preview tab. This is critical
 * because the preview system in Replit needs to access the server through a different
 * mechanism than direct browser tabs.
 */
export function getDeploymentHost(): string {
  // Always return '0.0.0.0' regardless of environment to support Replit preview
  return '0.0.0.0';
}

/**
 * Log deployment information
 * 
 * @param port The port the server is running on
 * @param host The host the server is binding to
 */
export function logDeploymentInfo(port: number, host: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const environment = isProduction ? 'production' : 'development';
  
  console.log(`[Deployment] Server running on ${host}:${port}`);
  console.log(`[Deployment] Environment: ${environment}`);
  console.log(`[Deployment] Port forwarding: ${port === 80 ? 'Using standard HTTP port' : `Custom port: ${port}`}`);
  
  if (isProduction) {
    console.log('[Deployment] Production mode: Optimized for deployment');
  } else {
    console.log('[Deployment] Development mode: Hot reloading enabled');
  }
}