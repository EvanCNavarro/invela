/**
 * Risk Score Data Service
 * 
 * This service provides a centralized approach to managing risk score data,
 * ensuring consistency between local state, server state, and WebSocket updates.
 * It follows the Repository pattern to abstract data access and provide a single
 * source of truth for risk score configuration.
 */

import { apiRequest } from '@/lib/queryClient';
import { 
  RiskDimension, 
  RiskScoreConfiguration, 
  RiskPriorities,
  RiskThresholds,
  determineRiskLevel
} from '@/lib/risk-score-configuration-data';
import { QueryClient } from '@tanstack/react-query';
import riskScoreLogger from '@/lib/risk-score-logger';

// Define interfaces for API responses to ensure type safety
export interface PrioritiesResponse {
  dimensions: RiskDimension[];
  riskAcceptanceLevel?: number;
  lastUpdated?: string;
}

export interface ConfigurationResponse {
  dimensions: RiskDimension[];
  thresholds?: RiskThresholds;
  score?: number;
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

// Cache keys for consistent reference across the application
export const CACHE_KEYS = {
  PRIORITIES: ['/api/risk-score/priorities'],
  CONFIGURATION: ['/api/risk-score/configuration']
};

/**
 * Risk Score Data Service - Provides a unified interface for risk score data operations
 */
class RiskScoreDataService {
  private queryClient: QueryClient;
  
  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Save risk priorities to the server with proper caching and conflict resolution
   * @param priorities Risk priorities data to save
   * @returns Promise resolving to the saved data or error
   */
  async savePriorities(priorities: RiskPriorities): Promise<PrioritiesResponse> {
    try {
      // Log the save attempt for diagnostics
      riskScoreLogger.log('persist:service', 'Saving priorities', priorities);
      
      // Optimistically update the cache to improve perceived performance
      this.queryClient.setQueryData(CACHE_KEYS.PRIORITIES, priorities);
      
      // Send the data to the server
      const response = await apiRequest<PrioritiesResponse>('POST', '/api/risk-score/priorities', priorities);
      
      // Invalidate the query to ensure fresh data on next fetch
      this.queryClient.invalidateQueries({ queryKey: CACHE_KEYS.PRIORITIES });
      
      // Log successful save
      riskScoreLogger.log('persist:service', 'Priorities saved successfully', response);
      
      return response;
    } catch (error) {
      // Log the error and rethrow
      riskScoreLogger.error('persist:service', 'Failed to save priorities', error);
      throw error;
    }
  }

  /**
   * Save the risk configuration to the server with proper caching
   * @param configuration Risk score configuration to save
   * @returns Promise resolving to the saved data or error
   */
  async saveConfiguration(configuration: RiskScoreConfiguration): Promise<ConfigurationResponse> {
    try {
      // Log the save attempt for diagnostics
      riskScoreLogger.log('persist:service', 'Saving configuration', configuration);
      
      // Optimistically update the cache
      this.queryClient.setQueryData(CACHE_KEYS.CONFIGURATION, configuration);
      
      // Send the data to the server
      const response = await apiRequest<ConfigurationResponse>('POST', '/api/risk-score/configuration', configuration);
      
      // Invalidate the query to ensure fresh data on next fetch
      this.queryClient.invalidateQueries({ queryKey: CACHE_KEYS.CONFIGURATION });
      
      // Log successful save
      riskScoreLogger.log('persist:service', 'Configuration saved successfully', response);
      
      return response;
    } catch (error) {
      // Log the error and rethrow
      riskScoreLogger.error('persist:service', 'Failed to save configuration', error);
      throw error;
    }
  }

  /**
   * Save both priorities and configuration in a coordinated way
   * This ensures consistency between both data sources and proper persistence
   */
  async saveRiskScoreData(
    dimensions: RiskDimension[],
    score: number,
    thresholds: RiskThresholds
  ): Promise<{priorities: PrioritiesResponse, configuration: ConfigurationResponse}> {
    try {
      // Log the coordinated save attempt
      riskScoreLogger.log('persist:service', 'Starting coordinated save operation');
      
      // Ensure we have clean copies of the data to avoid reference issues
      const cleanDimensions = JSON.parse(JSON.stringify(dimensions));
      
      // Create the priorities object with current risk acceptance level
      const priorities: RiskPriorities = {
        dimensions: cleanDimensions,
        riskAcceptanceLevel: score,
        lastUpdated: new Date().toISOString()
      };
      
      // Create the configuration object for risk score configuration
      const configuration: RiskScoreConfiguration = {
        dimensions: cleanDimensions,
        thresholds,
        score,
        riskLevel: determineRiskLevel(score)
      };
      
      // Execute both save operations in parallel for efficiency
      const [prioritiesResult, configResult] = await Promise.all([
        this.savePriorities(priorities),
        this.saveConfiguration(configuration)
      ]);
      
      // Log successful parallel save
      riskScoreLogger.log('persist:service', 'Coordinated save completed successfully');
      
      return {
        priorities: prioritiesResult,
        configuration: configResult
      };
    } catch (error) {
      // Log the error and rethrow
      riskScoreLogger.error('persist:service', 'Coordinated save operation failed', error);
      throw error;
    }
  }

  /**
   * Handle a WebSocket update for risk priorities
   * Ensures the local cache is updated consistently with server-pushed changes
   */
  handleWebSocketPrioritiesUpdate(data: any): void {
    try {
      riskScoreLogger.log('websocket:service', 'Received WebSocket priorities update', data);
      
      let updatedPriorities: PrioritiesResponse | null = null;
      
      // Handle different payload formats for backward compatibility
      if (data && data.priorities && data.priorities.dimensions) {
        // Format: { priorities: { dimensions: [...] } }
        updatedPriorities = {
          dimensions: data.priorities.dimensions,
          riskAcceptanceLevel: data.priorities.riskAcceptanceLevel,
          lastUpdated: data.updatedAt || new Date().toISOString()
        };
      } else if (data && data.dimensions) {
        // Alternative format: { dimensions: [...] }
        updatedPriorities = {
          dimensions: data.dimensions,
          riskAcceptanceLevel: data.riskAcceptanceLevel,
          lastUpdated: data.updatedAt || new Date().toISOString()
        };
      }
      
      if (updatedPriorities) {
        // Update the cache with the new data
        this.queryClient.setQueryData(CACHE_KEYS.PRIORITIES, updatedPriorities);
        riskScoreLogger.log('websocket:service', 'WebSocket update applied to priorities cache');
      } else {
        riskScoreLogger.warn('websocket:service', 'WebSocket update had invalid format', data);
      }
    } catch (error) {
      riskScoreLogger.error('websocket:service', 'Error handling WebSocket update', error);
    }
  }

  /**
   * Handle a WebSocket update for risk score
   * Ensures the local cache is updated consistently with server-pushed changes
   */
  handleWebSocketScoreUpdate(data: any): void {
    try {
      riskScoreLogger.log('websocket:service', 'Received WebSocket score update', data);
      
      if (data && data.newScore !== undefined) {
        // Get the current configuration from cache
        const currentConfig = this.queryClient.getQueryData<ConfigurationResponse>(CACHE_KEYS.CONFIGURATION);
        
        if (currentConfig) {
          // Update the configuration with the new score
          const updatedConfig: ConfigurationResponse = {
            ...currentConfig,
            score: data.newScore,
            riskLevel: determineRiskLevel(data.newScore)
          };
          
          // Update the cache
          this.queryClient.setQueryData(CACHE_KEYS.CONFIGURATION, updatedConfig);
          riskScoreLogger.log('websocket:service', 'WebSocket update applied to configuration cache');
        }
      } else {
        riskScoreLogger.warn('websocket:service', 'WebSocket score update had invalid format', data);
      }
    } catch (error) {
      riskScoreLogger.error('websocket:service', 'Error handling WebSocket score update', error);
    }
  }

  /**
   * Get the current priorities data from the cache
   * Useful for getting a snapshot of the current state
   */
  getCachedPriorities(): PrioritiesResponse | null {
    return this.queryClient.getQueryData<PrioritiesResponse>(CACHE_KEYS.PRIORITIES) || null;
  }

  /**
   * Get the current configuration data from the cache
   * Useful for getting a snapshot of the current state
   */
  getCachedConfiguration(): ConfigurationResponse | null {
    return this.queryClient.getQueryData<ConfigurationResponse>(CACHE_KEYS.CONFIGURATION) || null;
  }
}

// Create a singleton instance factory to ensure consistency
let instance: RiskScoreDataService | null = null;

/**
 * Initialize the Risk Score Data Service with the application's query client
 * Call this during application bootstrap
 */
export function initRiskScoreDataService(queryClient: QueryClient): RiskScoreDataService {
  instance = new RiskScoreDataService(queryClient);
  return instance;
}

/**
 * Get the Risk Score Data Service instance
 * Will throw an error if used before initialization
 */
export function getRiskScoreDataService(): RiskScoreDataService {
  if (!instance) {
    throw new Error('RiskScoreDataService not initialized. Call initRiskScoreDataService first.');
  }
  return instance;
}

export default RiskScoreDataService;