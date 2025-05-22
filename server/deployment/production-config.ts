/**
 * Production Configuration and Deployment Readiness Module
 * 
 * This module centralizes all production deployment configurations and
 * provides validation to ensure the application is ready for Replit deployment.
 * 
 * Features:
 * - Environment validation and configuration
 * - Build optimization settings
 * - Deployment health checks
 * - Resource allocation optimization
 */

import { logger } from '../utils/logger';

/**
 * Production deployment configuration interface
 */
interface ProductionConfig {
  port: number;
  host: string;
  nodeEnv: string;
  isDeployment: boolean;
  database: {
    skipMigrations: boolean;
    enableHealthChecks: boolean;
  };
  websocket: {
    enabled: boolean;
    path: string;
  };
  build: {
    minify: boolean;
    sourceMaps: boolean;
    optimization: boolean;
  };
}

/**
 * Get optimized production configuration
 * 
 * @returns Production configuration object
 */
export function getProductionConfig(): ProductionConfig {
  const isDeployment = process.env.REPLIT_AUTOSCALE_DEPLOYMENT === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    port: isDeployment ? 8080 : (parseInt(process.env.PORT || '5000', 10)),
    host: '0.0.0.0', // Required for Replit deployment
    nodeEnv: isDeployment ? 'production' : (process.env.NODE_ENV || 'development'),
    isDeployment,
    database: {
      skipMigrations: isDeployment || process.env.SKIP_MIGRATIONS === 'true',
      enableHealthChecks: true,
    },
    websocket: {
      enabled: true,
      path: '/ws',
    },
    build: {
      minify: isProduction || isDeployment,
      sourceMaps: !isDeployment, // Disable source maps in production to save space
      optimization: isProduction || isDeployment,
    }
  };
}

/**
 * Validate production environment variables
 * 
 * @returns Array of validation issues, empty if all good
 */
export function validateProductionEnvironment(): string[] {
  const issues: string[] = [];
  const config = getProductionConfig();

  // Check essential environment variables
  if (!process.env.DATABASE_URL) {
    issues.push('DATABASE_URL environment variable is required');
  }

  // Port validation
  if (config.port < 1 || config.port > 65535) {
    issues.push(`Invalid port number: ${config.port}`);
  }

  // Deployment-specific validations
  if (config.isDeployment) {
    if (config.port !== 8080) {
      issues.push(`Deployment port should be 8080, got ${config.port}`);
    }
    
    if (config.nodeEnv !== 'production') {
      issues.push(`Deployment should use production environment, got ${config.nodeEnv}`);
    }
  }

  return issues;
}

/**
 * Log production deployment readiness status
 */
export function logDeploymentReadiness(): void {
  const config = getProductionConfig();
  const issues = validateProductionEnvironment();

  logger.info('[ProductionConfig] Deployment Configuration:', {
    port: config.port,
    host: config.host,
    environment: config.nodeEnv,
    isDeployment: config.isDeployment,
    databaseMigrations: config.database.skipMigrations ? 'skipped' : 'enabled',
    websocketEnabled: config.websocket.enabled,
    buildOptimization: config.build.optimization
  });

  if (issues.length === 0) {
    logger.info('[ProductionConfig] ✅ Application is ready for production deployment');
  } else {
    logger.warn('[ProductionConfig] ⚠️ Production deployment issues detected:', { issues });
  }
}

/**
 * Apply production optimizations
 * This function applies various optimizations for production deployment
 */
export function applyProductionOptimizations(): void {
  const config = getProductionConfig();

  if (!config.isDeployment) {
    logger.info('[ProductionConfig] Development mode - skipping production optimizations');
    return;
  }

  // Set production environment variables
  process.env.NODE_ENV = 'production';
  process.env.PORT = config.port.toString();
  process.env.HOST = config.host;

  // Apply memory optimizations for Node.js
  if (!process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS = '--max-old-space-size=512';
    logger.info('[ProductionConfig] Applied memory optimization: max-old-space-size=512MB');
  }

  // Disable unnecessary logging in production
  if (config.isDeployment) {
    process.env.LOG_LEVEL = 'info'; // Reduce verbose logging
    logger.info('[ProductionConfig] Applied logging optimization: LOG_LEVEL=info');
  }

  logger.info('[ProductionConfig] ✅ Production optimizations applied successfully');
}

/**
 * Export the main configuration for use throughout the application
 */
export default getProductionConfig;