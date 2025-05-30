/**
 * Risk Score Data Hook - Simplified Implementation
 * 
 * A streamlined hook following KISS (Keep It Simple, Stupid), DRY (Don't Repeat Yourself),
 * and OODA (Observe, Orient, Decide, Act) principles.
 * 
 * This implementation focuses on:
 * 1. Predictable data flow
 * 2. Clear state management
 * 3. Simple API
 * 4. Proper error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import riskScoreLogger from '@/lib/risk-score-logger';
// Legacy WebSocket manager import removed - now using unified WebSocket provider
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
  PrioritiesResponse
} from '@/lib/risk-score-data-service';

/**
 * Custom hook for risk score data management
 * Provides a single source of truth for risk score operations
 */
export function useRiskScoreData() {
  // User-interface state
  const [dimensions, setDimensions] = useState<RiskDimension[]>(defaultRiskDimensions);
  const [score, setScore] = useState<number>(50);
  const [riskLevel, setRiskLevel] = useState<'none' | 'low' | 'medium' | 'high' | 'critical'>('medium');
  const [userSetScore, setUserSetScore] = useState<boolean>(false);
  const [thresholds] = useState<RiskThresholds>(defaultRiskThresholds);
  
  // Track original saved values to enable/disable Save button
  const [savedValues, setSavedValues] = useState<{
    dimensions: RiskDimension[];
    score: number;
  } | null>(null);
  
  // UI feedback hooks
  const { toast } = useToast();
  const riskScoreService = getRiskScoreDataService();

  /**
   * Primary data source: Priorities API
   * This query handles all dimension data and risk acceptance level
   */
  const { 
    data: prioritiesData,
    isLoading: isLoadingPriorities,
    isError: isErrorPriorities,
    refetch: refetchPriorities
  } = useQuery<PrioritiesResponse>({
    queryKey: CACHE_KEYS.PRIORITIES,
    staleTime: 0,  // Always fetch fresh data
    gcTime: 30000, // Keep in cache for 30 seconds
  });

  /**
   * Single save operation for both priorities and risk acceptance level
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      riskScoreLogger.log('save:operation', 'Saving data', { score, dimensions });
      return riskScoreService.saveRiskScoreData(dimensions, score, thresholds);
    },
    onSuccess: () => {
      // Success feedback
      toast({
        title: 'Changes saved',
        description: 'Your risk score configuration has been saved successfully.',
        variant: 'success',
      });

      // Verify data consistency
      refetchPriorities();
    },
    onError: (error: Error) => {
      // Error feedback
      toast({
        title: 'Failed to save',
        description: 'There was an error saving your configuration. Please try again.',
        variant: 'destructive',
      });
      
      riskScoreLogger.error('save:operation', 'Save failed', error);
    }
  });

  /**
   * OBSERVE: Data initialization and update from server
   * Load data from API response on first render and whenever data changes
   */
  useEffect(() => {
    if (!isLoadingPriorities && prioritiesData) {
      // Only update if we have valid data
      if (Array.isArray(prioritiesData.dimensions) && prioritiesData.dimensions.length > 0) {
        riskScoreLogger.log('init', 'Applying server data', prioritiesData);
        
        // Make a deep copy of the data to avoid reference issues
        const dimensionsCopy = JSON.parse(JSON.stringify(prioritiesData.dimensions));
        
        // Apply dimensions to current state
        setDimensions(dimensionsCopy);
        
        // Apply risk acceptance level if available
        const acceptanceLevel = prioritiesData.riskAcceptanceLevel !== undefined 
          ? prioritiesData.riskAcceptanceLevel 
          : 50; // Default if not set
        
        setScore(acceptanceLevel);
        setRiskLevel(determineRiskLevel(acceptanceLevel));
        setUserSetScore(true);
        riskScoreLogger.log('init', `Loaded user-set risk acceptance level: ${acceptanceLevel}`);
        
        // Save the original values to compare against for enabling/disabling Save button
        setSavedValues({
          dimensions: dimensionsCopy,
          score: acceptanceLevel
        });
      }
    }
  }, [prioritiesData, isLoadingPriorities]);

  /**
   * ORIENT: Calculate weights when dimension order changes
   * Applies a weight distribution based on dimension position
   */
  const applyWeightDistribution = useCallback(() => {
    // Weights distribution formula (highest to lowest priority)
    const weights = [30, 25, 20, 15, 7, 3]; // Total 100%
    
    setDimensions(prevDimensions => {
      const updatedDimensions = prevDimensions.map((dim, index) => ({
        ...dim,
        weight: weights[index] || 0
      }));
      
      riskScoreLogger.log('weights', 'Updated weight distribution', 
        updatedDimensions.map((d, i) => `${i+1}. ${d.name} (${d.weight}%)`).join(', '));
      
      return updatedDimensions;
    });
  }, []);

  /**
   * Apply weight changes after dimension order changes
   */
  useEffect(() => {
    // Only run if we have dimensions
    if (dimensions.length > 0) {
      applyWeightDistribution();
    }
  }, [dimensions.map(d => d.id).join(','), applyWeightDistribution]);

  /**
   * DECIDE: WebSocket event listeners for real-time updates
   * Handles incoming updates from other users or sessions
   */
  useEffect(() => {
    const handleServerUpdate = (data: any) => {
      riskScoreLogger.log('websocket', 'Received update', data);
      
      // Handle score updates
      if (data?.newScore !== undefined) {
        setScore(data.newScore);
        setRiskLevel(determineRiskLevel(data.newScore));
        setUserSetScore(true);
      }
      
      // Handle dimension updates
      const newDimensions = data?.dimensions || data?.priorities?.dimensions;
      if (Array.isArray(newDimensions)) {
        setDimensions(newDimensions);
      }
      
      // Handle risk acceptance level
      const riskAcceptanceLevel = data?.riskAcceptanceLevel || data?.priorities?.riskAcceptanceLevel;
      if (riskAcceptanceLevel !== undefined) {
        setScore(riskAcceptanceLevel);
        setRiskLevel(determineRiskLevel(riskAcceptanceLevel));
        setUserSetScore(true);
      }
    };
    
    // Register event listeners
    const unsubscribers = [
      wsManager.on('risk_score_update', handleServerUpdate),
      wsManager.on('risk_priorities_update', handleServerUpdate),
      wsManager.on('risk_priority_update', handleServerUpdate)
    ];
    
    // Cleanup on unmount
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  /**
   * ACT: Public API actions
   * These are the functions exposed to components
   */
  
  // Handle dimension reordering (from drag-and-drop)
  const handleReorder = useCallback((dragIndex: number, hoverIndex: number) => {
    setDimensions(prevDimensions => {
      const newDimensions = [...prevDimensions];
      const draggedItem = newDimensions[dragIndex];
      
      // Remove, then insert at new position
      newDimensions.splice(dragIndex, 1);
      newDimensions.splice(hoverIndex, 0, draggedItem);
      
      return newDimensions;
    });
  }, []);

  // Change value for individual dimension (preserved for backward compatibility)
  const handleValueChange = useCallback((id: string, value: number) => {
    setDimensions(prevDimensions => 
      prevDimensions.map(dim => dim.id === id ? { ...dim, value } : dim)
    );
  }, []);

  // Save configuration
  const handleSave = useCallback(() => {
    riskScoreLogger.log('user:action', 'User initiated save', {
      userSetScore,
      score
    });
    
    saveMutation.mutate();
    
    // After saving, update the savedValues to match current values
    setSavedValues({
      dimensions: JSON.parse(JSON.stringify(dimensions)),
      score
    });
  }, [saveMutation, score, userSetScore, dimensions]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setDimensions(defaultRiskDimensions);
    setScore(50);
    setRiskLevel('medium');
    setUserSetScore(false);
    
    toast({
      title: 'Reset to defaults',
      description: 'Risk score configuration has been reset to default values.',
      variant: 'default',
    });
    
    riskScoreLogger.log('user:action', 'User reset to defaults');
  }, [toast]);

  // Change risk acceptance level (slider)
  const handleScoreChange = useCallback((newScore: number) => {
    setScore(newScore);
    setRiskLevel(determineRiskLevel(newScore));
    
    riskScoreLogger.log('user:action', `Risk acceptance level changed to ${newScore}`);
  }, []);
  
  // Check if current values differ from default values
  const hasDiffFromDefaults = useCallback(() => {
    // If score is not 50 (default), then there's a difference
    if (score !== 50) return true;
    
    // Check if dimension order differs from default
    if (dimensions.length !== defaultRiskDimensions.length) return true;
    
    // Check each dimension's id in order to see if ordering has changed
    for (let i = 0; i < dimensions.length; i++) {
      if (dimensions[i].id !== defaultRiskDimensions[i].id) {
        return true;
      }
    }
    
    return false;
  }, [dimensions, score]);
  
  // Check if current values differ from saved values
  const hasDiffFromSaved = useCallback(() => {
    // If there are no saved values yet, definitely has differences
    if (!savedValues) return true;
    
    // If score is different, then there's a change
    if (score !== savedValues.score) return true;
    
    // Check if dimension order differs from saved
    if (dimensions.length !== savedValues.dimensions.length) return true;
    
    // Check each dimension's id in order to see if ordering has changed
    for (let i = 0; i < dimensions.length; i++) {
      if (dimensions[i].id !== savedValues.dimensions[i].id) {
        return true;
      }
    }
    
    return false;
  }, [dimensions, score, savedValues]);

  // Return the public API for components
  return {
    // State
    dimensions,
    thresholds,
    score,
    riskLevel,
    userSetScore,
    isLoading: isLoadingPriorities,
    isSaving: saveMutation.isPending,
    isError: isErrorPriorities,
    
    // Flag to indicate if reset button should be enabled
    hasDefaultsDiff: hasDiffFromDefaults(),
    
    // Flag to indicate if save button should be enabled
    hasSavedDiff: hasDiffFromSaved(),
    
    // Actions
    handleReorder,
    handleValueChange,
    handleSave,
    handleReset,
    handleScoreChange,
    setUserSetScore
  };
}