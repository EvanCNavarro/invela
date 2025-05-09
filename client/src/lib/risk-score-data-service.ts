/**
 * Risk Score Data Service - Simplified Implementation
 * 
 * Following KISS (Keep It Simple, Stupid), DRY (Don't Repeat Yourself),
 * and OODA (Observe, Orient, Decide, Act) principles.
 * 
 * This service provides:
 * - Single source of truth for risk score data
 * - Consistent caching and server synchronization
 * - WebSocket updates handling
 * - Error resilience
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
   * Ensures both riskAcceptanceLevel in priorities JSON and chosen_score in companies table are synchronized
   * @param priorities Risk priorities data to save
   * @returns Promise resolving to the saved data or error
   */
  async savePriorities(priorities: RiskPriorities): Promise<PrioritiesResponse> {
    try {
      // Ensure riskAcceptanceLevel is a number (convert from string if needed)
      if (priorities.riskAcceptanceLevel !== undefined) {
        const numericRiskLevel = Number(priorities.riskAcceptanceLevel);
        if (!isNaN(numericRiskLevel)) {
          priorities.riskAcceptanceLevel = numericRiskLevel;
        }
      }
      
      // Log the save attempt for diagnostics with the normalized data
      riskScoreLogger.log('persist:service', 'Saving priorities with risk level', priorities.riskAcceptanceLevel);
      
      // Optimistically update the cache to improve perceived performance
      this.queryClient.setQueryData(CACHE_KEYS.PRIORITIES, priorities);
      
      // Send the data to the server
      // This will update both risk_priorities JSON and chosen_score in companies table
      const response = await apiRequest<PrioritiesResponse>('POST', '/api/risk-score/priorities', {
        ...priorities,
        // Include an explicit updateCompanyScore flag to ensure server updates both values
        updateCompanyScore: true,
      });
      
      // Invalidate BOTH queries to ensure fresh data on next fetch
      this.queryClient.invalidateQueries({ queryKey: CACHE_KEYS.PRIORITIES });
      
      // Also invalidate companies/current to reflect chosen_score changes
      this.queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      
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
   * Also synchronizes the company.chosen_score value with the risk acceptance level
   */
  async saveRiskScoreData(
    dimensions: RiskDimension[],
    score: number | string,
    thresholds: RiskThresholds
  ): Promise<{priorities: PrioritiesResponse, configuration: ConfigurationResponse}> {
    try {
      // Ensure the score is a proper number
      const numericScore = typeof score === 'string' ? parseInt(score, 10) : score;
      
      // Log the coordinated save attempt with the score type
      riskScoreLogger.log('persist:service', 'Starting coordinated save operation', {
        scoreType: typeof score,
        originalScore: score,
        normalizedScore: numericScore
      });
      
      // Ensure we have clean copies of the data to avoid reference issues
      const cleanDimensions = JSON.parse(JSON.stringify(dimensions));
      
      // Create the priorities object with current risk acceptance level
      const priorities: RiskPriorities = {
        dimensions: cleanDimensions,
        riskAcceptanceLevel: numericScore,
        lastUpdated: new Date().toISOString()
      };
      
      // Create the configuration object for risk score configuration
      const configuration: RiskScoreConfiguration = {
        dimensions: cleanDimensions,
        thresholds,
        score: numericScore,
        riskLevel: determineRiskLevel(numericScore)
      };
      
      // Add the updateCompanyScore flag to ensure chosen_score is updated
      const prioritiesWithFlag = {
        ...priorities,
        updateCompanyScore: true // Always update the chosen_score in companies table
      };
      
      // Execute both save operations in parallel for efficiency
      const [prioritiesResult, configResult] = await Promise.all([
        this.savePriorities(prioritiesWithFlag),
        this.saveConfiguration(configuration)
      ]);
      
      // Log successful parallel save
      riskScoreLogger.log('persist:service', 'Coordinated save completed successfully', {
        savedScore: numericScore,
        riskLevel: determineRiskLevel(numericScore)
      });
      
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
   * Fetch fresh priorities data from the server and update cache
   * @returns Promise resolving to the fetched data
   */
  async fetchFreshPriorities(): Promise<PrioritiesResponse> {
    try {
      riskScoreLogger.log('fetch:service', 'Fetching fresh priorities data from server');
      
      // Make the API request
      const response = await apiRequest<PrioritiesResponse>('GET', '/api/risk-score/priorities');
      
      // Update the cache with the fresh data
      this.queryClient.setQueryData(CACHE_KEYS.PRIORITIES, response);
      
      riskScoreLogger.log('fetch:service', 'Priorities data fetched and cache updated');
      
      return response;
    } catch (error) {
      riskScoreLogger.error('fetch:service', 'Failed to fetch priorities data', error);
      throw error;
    }
  }
  
  /**
   * Fetch fresh configuration data from the server and update cache
   * @returns Promise resolving to the fetched data
   */
  async fetchFreshConfiguration(): Promise<ConfigurationResponse> {
    try {
      riskScoreLogger.log('fetch:service', 'Fetching fresh configuration data from server');
      
      // Make the API request
      const response = await apiRequest<ConfigurationResponse>('GET', '/api/risk-score/configuration');
      
      // Update the cache with the fresh data
      this.queryClient.setQueryData(CACHE_KEYS.CONFIGURATION, response);
      
      riskScoreLogger.log('fetch:service', 'Configuration data fetched and cache updated');
      
      return response;
    } catch (error) {
      riskScoreLogger.error('fetch:service', 'Failed to fetch configuration data', error);
      throw error;
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