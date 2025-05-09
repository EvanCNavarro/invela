/**
 * Risk Score Data Hook
 * 
 * A custom hook that provides a clean interface for components to interact 
 * with risk score data. Handles data fetching, caching, and state management 
 * for risk score configuration and priorities.
 * 
 * This hook follows the repository pattern and serves as the single source of truth
 * for risk score data in the application.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import riskScoreLogger from '@/lib/risk-score-logger';
import wsManager from '../lib/web-socket-manager';
import { 
  RiskDimension, 
  RiskThresholds,
  defaultRiskDimensions,
  defaultRiskThresholds,
  determineRiskLevel 
} from '@/lib/risk-score-configuration-data';
import { 
  getRiskScoreDataService, 
  CACHE_KEYS,
  PrioritiesResponse,
  ConfigurationResponse
} from '@/lib/risk-score-data-service';

/**
 * Custom hook for managing risk score data
 * Provides a consistent interface for risk score operations
 */
export function useRiskScoreData() {
  // State for the component
  const [dimensions, setDimensions] = useState<RiskDimension[]>(defaultRiskDimensions);
  const [thresholds, setThresholds] = useState<RiskThresholds>(defaultRiskThresholds);
  const [score, setScore] = useState<number>(50);
  const [riskLevel, setRiskLevel] = useState<'none' | 'low' | 'medium' | 'high' | 'critical'>('medium');
  const [userSetScore, setUserSetScore] = useState<boolean>(false);
  
  // Track if initial data has been loaded
  const initialDataLoaded = useRef<boolean>(false);
  
  // Reference to track original dimensions for comparison
  const originalDimensionsRef = useRef<RiskDimension[] | null>(null);
  
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get the risk score data service
  const riskScoreDataService = getRiskScoreDataService();

  /**
   * Query for risk score configuration
   * This is considered secondary to priorities for dimensions ordering
   */
  const { 
    data: configData, 
    isLoading: isLoadingConfig,
    isStale: isStaleConfig,
    isError: isErrorConfig,
    refetch: refetchConfig
  } = useQuery<ConfigurationResponse>({
    queryKey: CACHE_KEYS.CONFIGURATION,
    staleTime: 0, // Always consider data stale - critical fix
    refetchOnWindowFocus: true, // Always fetch fresh data when tab regains focus
    refetchOnMount: true, // Always fetch fresh data when component mounts
    gcTime: 60000, // Keep in cache for only 1 minute
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  /**
   * Query for risk priorities data
   * This is the primary source of truth for dimensions ordering
   */
  const { 
    data: prioritiesData, 
    isLoading: isLoadingPriorities,
    isStale: isStalePriorities,
    isError: isErrorPriorities,
    refetch: refetchPriorities 
  } = useQuery<PrioritiesResponse>({
    queryKey: CACHE_KEYS.PRIORITIES,
    staleTime: 0, // Always consider data stale - critical fix
    refetchOnWindowFocus: true, // Always fetch fresh data when tab regains focus
    refetchOnMount: true, // Always fetch fresh data when component mounts
    gcTime: 60000, // Keep in cache for only 1 minute
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  /**
   * Apply data from server in the correct order
   * This ensures that priorities data takes precedence for dimension ordering
   */
  useEffect(() => {
    // Only process once both queries have completed to ensure data consistency
    if (!isLoadingConfig && !isLoadingPriorities) {
      // If priorities data exists, use it as the primary source of truth for dimensions
      if (prioritiesData && Array.isArray(prioritiesData.dimensions)) {
        riskScoreLogger.log('data:hook', `Applying priorities data with ${prioritiesData.dimensions.length} dimensions`);
        
        // Create a deep copy to avoid reference issues
        const newDimensions = JSON.parse(JSON.stringify(prioritiesData.dimensions));
        
        // Set dimensions from priorities data
        setDimensions(newDimensions);
        
        // Store original dimensions for comparison
        originalDimensionsRef.current = JSON.parse(JSON.stringify(newDimensions));
        
        // Apply risk acceptance level if available
        if (prioritiesData.riskAcceptanceLevel !== undefined) {
          setScore(prioritiesData.riskAcceptanceLevel);
          setRiskLevel(determineRiskLevel(prioritiesData.riskAcceptanceLevel));
          // Mark as user-set since a risk acceptance level from the server means it was previously set by a user
          setUserSetScore(true);
          riskScoreLogger.log('data:hook', `Loaded user-set risk acceptance level: ${prioritiesData.riskAcceptanceLevel}`);
        }
      } 
      // If priorities data doesn't exist but config data does, fall back to config data
      else if (configData && Array.isArray(configData.dimensions)) {
        riskScoreLogger.log('data:hook', 'Falling back to configuration data for dimensions');
        
        // Only use config data if priorities data is not available
        setDimensions(configData.dimensions);
        
        // Store original dimensions
        originalDimensionsRef.current = JSON.parse(JSON.stringify(configData.dimensions));
        
        // Apply score and thresholds
        if (configData.score !== undefined) {
          setScore(configData.score);
          setRiskLevel(configData.riskLevel || determineRiskLevel(configData.score));
          // Mark as user-set since a score from the server means it was previously saved
          setUserSetScore(true);
          riskScoreLogger.log('data:hook', `Loaded user-set risk score from config: ${configData.score}`);
        }
        
        if (configData.thresholds) {
          setThresholds(configData.thresholds);
        }
      } 
      // If neither data source has dimensions, use defaults
      else {
        riskScoreLogger.log('data:hook', 'Using default dimensions as no server data is available');
        setDimensions(defaultRiskDimensions);
        originalDimensionsRef.current = JSON.parse(JSON.stringify(defaultRiskDimensions));
      }
      
      // Mark that initial data has been loaded
      initialDataLoaded.current = true;
    }
  }, [isLoadingConfig, isLoadingPriorities, configData, prioritiesData]);

  /**
   * Calculate the weight distribution based on dimension order
   * Creates a weighted distribution with emphasis on top positions
   */
  const calculateWeightDistribution = useCallback((dimensions: RiskDimension[]): RiskDimension[] => {
    // For 6 dimensions, weights distributed based on position with emphasis on top positions
    const weights = [30, 25, 20, 15, 7, 3]; // Total 100%
    
    return dimensions.map((dim, index) => ({
      ...dim,
      weight: weights[index] || 0
    }));
  }, []);

  /**
   * Update weight distribution when dimension order changes
   */
  useEffect(() => {
    // Only calculate weights if we have dimensions and initial data has been loaded
    if (dimensions.length && initialDataLoaded.current) {
      const newDimensions = calculateWeightDistribution([...dimensions]);
      setDimensions(newDimensions);
      
      // Log dimension priority changes
      riskScoreLogger.log('priority', `Dimensions updated: ${newDimensions.map((d, i) => `${i+1}. ${d.name} (${Math.round(d.weight)}%)`).join(', ')}`);
    }
    // This dependency array is intentionally simple to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.map(d => d.id).join(','), calculateWeightDistribution]);

  /**
   * Calculate score and risk level when dimensions change,
   * but only if user hasn't manually set a score
   */
  useEffect(() => {
    // Only calculate if we have dimensions, initial data loaded, and user hasn't manually set a score
    if (dimensions && dimensions.length > 0 && !userSetScore && initialDataLoaded.current) {
      // Calculate risk score based on dimension values and weights
      const totalWeight = dimensions.reduce((sum, dim) => sum + dim.weight, 0);
      const weightedScore = dimensions.reduce((sum, dim) => sum + (dim.value * dim.weight), 0) / totalWeight;
      
      const newScore = Math.round(weightedScore);
      setScore(newScore);
      setRiskLevel(determineRiskLevel(newScore));
      
      // Log the score calculation
      riskScoreLogger.log('score', `Risk score recalculated: ${newScore} (${determineRiskLevel(newScore)} risk) based on dimension changes`);
    }
  }, [dimensions, userSetScore]);

  /**
   * Mutation to save both priority and configuration data
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      return riskScoreDataService.saveRiskScoreData(dimensions, score, thresholds);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Changes saved',
        description: 'Your risk score configuration has been saved successfully.',
        variant: 'success',
      });
      
      // Force a refetch to ensure we have the latest data
      refetchPriorities().then(result => {
        if (result.data && result.data.dimensions) {
          riskScoreLogger.log('persist', 'Verified save was successful - data matches');
        }
      });
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Failed to save',
        description: 'There was an error saving your configuration. Please try again.',
        variant: 'destructive',
      });
      
      riskScoreLogger.error('persist', 'Error saving risk score data', error);
    }
  });

  /**
   * Set up WebSocket event handlers for real-time updates
   */
  useEffect(() => {
    // Handler for risk score updates from other users/sessions
    const handleRiskScoreUpdate = (data: any) => {
      riskScoreLogger.log('websocket', 'Received risk score update from WebSocket', data);
      
      if (data && data.newScore !== undefined) {
        setScore(data.newScore);
        setRiskLevel(determineRiskLevel(data.newScore));
        // Mark as user-set since a direct risk score update implies user intent
        setUserSetScore(true);
        
        // Also update the service's cached data
        riskScoreDataService.handleWebSocketScoreUpdate(data);
        
        toast({
          title: 'Risk Score Updated',
          description: `Risk score has been updated to ${data.newScore}`,
          variant: 'default',
        });
        
        riskScoreLogger.log('websocket', `Received direct risk score update: ${data.newScore} (marked as user-set)`);
      }
    };
    
    // Handler for risk priorities updates from other users/sessions
    const handleRiskPrioritiesUpdate = (data: any) => {
      riskScoreLogger.log('websocket', 'Received risk priorities update from WebSocket', data);
      
      // Update the service's cached data first
      riskScoreDataService.handleWebSocketPrioritiesUpdate(data);
      
      // Then determine what to apply to our local state
      let newDimensions: RiskDimension[] | null = null;
      let previousScore = score;
      
      // Handle both formats for backward compatibility
      if (data && data.priorities && data.priorities.dimensions) {
        newDimensions = data.priorities.dimensions;
        
        // Apply risk acceptance level if provided and preserve userSetScore
        if (data.priorities.riskAcceptanceLevel !== undefined) {
          // Only update if the score has actually changed
          if (data.priorities.riskAcceptanceLevel !== previousScore) {
            setScore(data.priorities.riskAcceptanceLevel);
            setRiskLevel(determineRiskLevel(data.priorities.riskAcceptanceLevel));
            // IMPORTANT: Mark as user-set since the server is sending a specific risk acceptance level
            setUserSetScore(true);
            riskScoreLogger.log('websocket', `Received risk acceptance level from WebSocket: ${data.priorities.riskAcceptanceLevel} (marked as user-set)`);
          }
        }
      } else if (data && data.dimensions) {
        newDimensions = data.dimensions;
        
        // Apply risk acceptance level if provided and preserve userSetScore
        if (data.riskAcceptanceLevel !== undefined) {
          // Only update if the score has actually changed
          if (data.riskAcceptanceLevel !== previousScore) {
            setScore(data.riskAcceptanceLevel);
            setRiskLevel(determineRiskLevel(data.riskAcceptanceLevel));
            // IMPORTANT: Mark as user-set since the server is sending a specific risk acceptance level
            setUserSetScore(true);
            riskScoreLogger.log('websocket', `Received risk acceptance level from WebSocket (alt format): ${data.riskAcceptanceLevel} (marked as user-set)`);
          }
        }
      }
      
      // Apply dimensions update if we got valid data
      if (newDimensions) {
        setDimensions(newDimensions);
        originalDimensionsRef.current = JSON.parse(JSON.stringify(newDimensions));
        
        toast({
          title: 'Risk Priorities Updated',
          description: 'Risk dimension priorities have been updated',
          variant: 'default',
        });
      }
    };
    
    // Register WebSocket event handlers
    const riskScoreUnsubscribe = wsManager.on('risk_score_update', handleRiskScoreUpdate);
    const riskPrioritiesUnsubscribe = wsManager.on('risk_priorities_update', handleRiskPrioritiesUpdate);
    const riskPriorityUnsubscribe = wsManager.on('risk_priority_update', handleRiskPrioritiesUpdate);
    
    // Cleanup function to remove WebSocket event handlers
    return () => {
      riskScoreUnsubscribe();
      riskPrioritiesUnsubscribe();
      riskPriorityUnsubscribe();
      riskScoreLogger.log('websocket', 'Removed WebSocket event handlers');
    };
  }, [toast]);

  /**
   * Handle dimension reordering
   * This is used by drag and drop functionality
   */
  const handleReorder = useCallback((dragIndex: number, hoverIndex: number) => {
    setDimensions(prevDimensions => {
      const newDimensions = [...prevDimensions];
      const draggedItem = newDimensions[dragIndex];
      
      // Remove the dragged item
      newDimensions.splice(dragIndex, 1);
      
      // Insert it at the new position
      newDimensions.splice(hoverIndex, 0, draggedItem);
      
      return newDimensions;
    });
  }, []);

  /**
   * Handle value change for a dimension
   */
  const handleValueChange = useCallback((id: string, value: number) => {
    setDimensions(prevDimensions => {
      return prevDimensions.map(dim => 
        dim.id === id ? { ...dim, value } : dim
      );
    });
  }, []);

  /**
   * Save both configuration and priorities
   */
  const handleSave = useCallback(() => {
    // Log the current state before saving
    riskScoreLogger.log('persist:save', 'Saving risk score configuration', {
      score,
      userSetScore,
      dimensionsCount: dimensions.length
    });
    
    // Trigger the save mutation
    saveMutation.mutate();
    
    // Ensure we don't lose the userSetScore flag after saving
    if (userSetScore) {
      // This ensures the flag stays true even after the WebSocket response
      setTimeout(() => {
        setUserSetScore(true);
      }, 500);
    }
  }, [saveMutation, score, userSetScore, dimensions.length]);

  /**
   * Reset to defaults
   */
  const handleReset = useCallback(() => {
    setDimensions(defaultRiskDimensions);
    setThresholds(defaultRiskThresholds);
    setScore(50);
    setRiskLevel('medium');
    setUserSetScore(false);
    
    // Update original dimensions reference
    originalDimensionsRef.current = JSON.parse(JSON.stringify(defaultRiskDimensions));
    
    toast({
      title: 'Reset to defaults',
      description: 'Risk score configuration has been reset to default values.',
      variant: 'default',
    });
  }, [toast]);

  /**
   * Handle user-initiated score changes
   */
  const handleScoreChange = useCallback((newScore: number) => {
    // Set the flag to indicate user has manually set the score
    setUserSetScore(true);
    setScore(newScore);
    setRiskLevel(determineRiskLevel(newScore));
    
    riskScoreLogger.log('score', `Risk score manually set to ${newScore} (${determineRiskLevel(newScore)} risk)`);
  }, []);

  // Return everything needed by components
  return {
    // State
    dimensions,
    thresholds,
    score,
    riskLevel,
    userSetScore,
    
    // Loading states
    isLoading: isLoadingConfig || isLoadingPriorities,
    isSaving: saveMutation.isPending,
    
    // Actions
    handleReorder,
    handleValueChange,
    handleSave,
    handleReset,
    handleScoreChange,
    setUserSetScore,
    
    // Data for components that need it
    originalDimensions: originalDimensionsRef.current
  };
}

export default useRiskScoreData;