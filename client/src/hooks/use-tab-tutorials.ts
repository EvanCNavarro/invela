/**
 * ========================================
 * Tab Tutorials Hook - Multi-Tab Learning Coordination
 * ========================================
 * 
 * Comprehensive tab tutorial management hook providing coordinated learning
 * experiences across multiple browser tabs and platform sections. Manages
 * tutorial progress, completion tracking, and cross-tab synchronization.
 * 
 * Key Features:
 * - Multi-tab tutorial state synchronization
 * - Tab name normalization for consistent identification
 * - Tutorial progress tracking with persistence
 * - Completion status management across sessions
 * - Advanced logging for tutorial analytics
 * 
 * Tutorial Coordination:
 * - Cross-tab progress synchronization
 * - Tab-specific tutorial customization
 * - Completion ceremony coordination
 * - Tutorial state caching for performance
 * - Analytics integration for learning insights
 * 
 * @module hooks/use-tab-tutorials
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for the TabTutorials hook
const logger = createTutorialLogger('TabTutorials');

// Define tutorial status interface
interface TutorialStatus {
  tabName: string;
  completed: boolean;
  currentStep: number;
  lastSeenAt: string | null;
  exists?: boolean;
}

/**
 * Normalizes tab names to a consistent format
 * This is a duplicate of the function in TutorialManager to ensure consistency
 * across the tutorial system.
 * 
 * @param inputTabName The tab name to normalize
 * @returns The normalized (canonical) tab name
 */
function normalizeTabName(inputTabName: string): string {
  // First, convert to lowercase and trim to handle case variations
  const cleanedTabName = inputTabName.toLowerCase().trim();
  
  // Define canonical names for each tab
  // This mapping ensures all variations of a tab name resolve to a single canonical name
  const tabMappings: Record<string, string> = {
    // Network tab variations
    'network-view': 'network',
    'network-visualization': 'network',
    
    // Claims tab variations
    'claims-risk': 'claims',
    'claims-risk-analysis': 'claims',
    
    // File vault tab variations
    'file-manager': 'file-vault',
    'filevault': 'file-vault',  // Handle PascalCase version
    'file-vault-page': 'file-vault',
    
    // Dashboard variations
    'dashboard-page': 'dashboard',
    
    // Company profile variations
    'company-profile-page': 'company-profile',
  };
  
  logger.info(`Normalizing tab name from '${inputTabName}' to canonical form`);
  
  // Return the canonical version or the original cleaned name
  const canonicalName = tabMappings[cleanedTabName] || cleanedTabName;
  
  if (canonicalName !== cleanedTabName) {
    logger.info(`Tab name normalized: '${cleanedTabName}' → '${canonicalName}'`);
  } else {
    logger.info(`Tab name already in canonical form: '${canonicalName}'`);
  }
  
  return canonicalName;
}

/**
 * Hook to manage tab-specific tutorial state
 * 
 * This hook handles loading tutorial status from the server,
 * and provides methods to update tutorial progress. It ensures
 * all tab names are normalized to their canonical form for consistency.
 */
export function useTabTutorials(inputTabName: string) {
  // First normalize the tab name to ensure consistency
  const tabName = normalizeTabName(inputTabName);
  
  // Local state to track tutorial status
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Calculate total steps based on content configuration
  const getTotalSteps = useCallback((tabNameInput: string) => {
    // Normalize the input tab name for consistency in step count
    const normalized = normalizeTabName(tabNameInput);
    
    // Return the appropriate step count for each tab
    switch (normalized) {
      case 'risk-score':
        return 5;
      case 'claims':
        return 5;
      case 'network':
        return 5;
      case 'file-vault':
        return 4;
      case 'insights':
        return 4;
      case 'dashboard':
        return 4;
      case 'company-profile':
        return 5;
      case 'playground':
        return 5;
      case 'risk-score-configuration':
        return 5;
      default:
        return 5;
    }
  }, []);
  
  const totalSteps = getTotalSteps(tabName);
  
  logger.init(`Initializing for tab: ${tabName} (original: ${inputTabName})`);
  
  // Fetch tutorial status from the server using the normalized tab name
  const { data, isLoading, error } = useQuery<TutorialStatus>({
    queryKey: ['/api/user-tab-tutorials/status', tabName],
    queryFn: async (): Promise<TutorialStatus> => {
      logger.info(`Fetching tutorial status for: ${tabName}`);
      try {
        const result = await apiRequest(`/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`);
        logger.info(`Received tutorial status for ${tabName}:`, result);
        return result as TutorialStatus;
      } catch (err) {
        logger.error(`Error fetching tutorial status for ${tabName}:`, err);
        throw err;
      }
    }
  });
  
  // Update tutorial progress mutation
  const updateTutorialMutation = useMutation({
    mutationFn: async (payload: { step: number, completed: boolean }) => {
      logger.info(`Updating tutorial for ${tabName}:`, payload);
      
      // Always use the normalized tab name when saving to the server
      return apiRequest(
        'POST', 
        '/api/user-tab-tutorials', 
        {
          tabName: tabName, // Use the normalized tab name for consistency
          currentStep: payload.step,
          completed: payload.completed,
          totalSteps: getTotalSteps(tabName)
        } 
      );
    },
    onSuccess: (result) => {
      logger.info(`Successfully updated tutorial for ${tabName}:`, result);
      // Invalidate tutorial status after update
      queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials/status', tabName] });
    },
    onError: (error) => {
      logger.error(`Error updating tutorial for ${tabName}:`, error);
    }
  });
  
  // Mark tutorial as seen mutation (for "Skip" functionality)
  const markSeenMutation = useMutation({
    mutationFn: async () => {
      logger.info(`Marking tutorial as seen for ${tabName}`);
      
      // Also use the normalized tab name for marking as seen
      return apiRequest(
        'POST',
        '/api/user-tab-tutorials/mark-seen',
        { 
          tabName: tabName, // Use the normalized tab name for consistency
          lastSeen: new Date().toISOString() 
        }
      );
    },
    onSuccess: (result) => {
      logger.info(`Successfully marked tutorial as seen for ${tabName}:`, result);
      // Invalidate tutorial status after update
      queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials/status', tabName] });
    },
    onError: (error) => {
      logger.error(`Error marking tutorial as seen for ${tabName}:`, error);
    }
  });
  
  // Update local state when data changes
  useEffect(() => {
    if (data) {
      logger.info(`Updating local state for ${tabName}:`, data);
      
      // Log the real step information from the database
      logger.info(`Real step information: currentStep=${data.currentStep}, totalSteps=${totalSteps}`);
      
      // Ensure we're using the exact value from the server
      // This will synchronize UI display with database values
      setCurrentStep(data.currentStep || 0);
      setIsCompleted(data.completed || false);
      setTutorialEnabled(true);
    } else if (error) {
      logger.error(`Error in tutorial data for ${tabName}:`, error);
    }
  }, [data, error, tabName, totalSteps]);
  
  // Handle advancing to next step
  const handleNext = useCallback(() => {
    const nextStep = currentStep + 1;
    logger.info(`Advancing to next step for ${tabName}: ${nextStep}`);
    setCurrentStep(nextStep);
    updateTutorialMutation.mutate({ step: nextStep, completed: false });
  }, [currentStep, updateTutorialMutation, tabName]);
  
  // Handle going back to previous step
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      logger.info(`Going back to previous step for ${tabName}: ${prevStep}`);
      setCurrentStep(prevStep);
      updateTutorialMutation.mutate({ step: prevStep, completed: false });
    }
  }, [currentStep, updateTutorialMutation, tabName]);
  
  // Handle completing the tutorial
  const handleComplete = useCallback(() => {
    logger.info(`Completing tutorial for ${tabName}`);
    setIsCompleted(true);
    updateTutorialMutation.mutate({ step: currentStep, completed: true });
  }, [currentStep, updateTutorialMutation, tabName]);
  
  // Mark tutorial as seen (Skip)
  const markTutorialSeen = useCallback(() => {
    logger.info(`Skipping tutorial for ${tabName}`);
    markSeenMutation.mutate();
  }, [markSeenMutation, tabName]);
  
  // Log the current state on every render
  logger.info(`Current state for ${tabName}:`, {
    tutorialEnabled,
    isLoading,
    error,
    currentStep,
    totalSteps,
    isCompleted
  });
  
  return {
    tutorialEnabled,
    isLoading,
    error,
    currentStep,
    totalSteps,
    isCompleted,
    handleNext,
    handleBack,
    handleComplete,
    markTutorialSeen,
    // Add original tab name for debugging
    originalTabName: inputTabName,
    // Add normalized tab name for debugging
    normalizedTabName: tabName
  };
}