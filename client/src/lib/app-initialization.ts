/**
 * Application Initialization Module
 * 
 * This module handles the initialization of application-wide services
 * that need to be set up before components are rendered.
 */

import { QueryClient } from '@tanstack/react-query';
import { initRiskScoreDataService } from './risk-score-data-service';
import riskScoreLogger from './risk-score-logger';

/**
 * Initialize all application services
 * Call this during application bootstrap
 */
export function initializeAppServices(queryClient: QueryClient): void {
  // Initialize the Risk Score Data Service
  try {
    const riskScoreService = initRiskScoreDataService(queryClient);
    riskScoreLogger.log('init', 'Risk Score Data Service initialized successfully');
    
    // Expose service on window for debugging in development only
    if (import.meta.env.DEV) {
      (window as any).__riskScoreService = riskScoreService;
      console.log('Risk Score Service exposed on window.__riskScoreService for development debugging');
    }
  } catch (error) {
    riskScoreLogger.error('init', 'Failed to initialize Risk Score Data Service', error);
    console.error('Failed to initialize Risk Score Data Service:', error);
  }
  
  // Additional service initializations can be added here
  
  riskScoreLogger.log('init', 'Application services initialized successfully');
}

export default initializeAppServices;