/**
 * DEPLOYMENT-SPECIFIC SERVER CONFIGURATION
 * 
 * This file is designed specifically for Replit Autoscale deployment.
 * It ensures:
 * 1. The server ONLY listens on port 8080
 * 2. No additional port forwards are created
 * 3. Proper host binding (0.0.0.0) for cloud environments
 */

// Force production environment for deployment
process.env.NODE_ENV = 'production';

// Force port 8080 for Replit Autoscale
process.env.PORT = '8080';

// Import the main server module to execute it with our environment settings
import './index.js';