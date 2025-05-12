import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { 
  normalizeTabName, 
  createTutorialEntry, 
  isTutorialEnabledForTab, 
  getTutorialStepCount 
} from '@/constants/tutorial-constants';

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
 * Hook to manage tab-specific tutorial state
 * 
 * This hook handles loading tutorial status from the server,
 * and provides methods to update tutorial progress. It ensures
 * all tab names are normalized to their canonical form for consistency.
 */
export function useTabTutorials(inputTabName: string) {
  // First normalize the tab name to ensure consistency using the central function
  const tabName = normalizeTabName(inputTabName);
  logger.info(`Using normalized tab name: '${tabName}' (original: '${inputTabName}')`);
  
  // Local state to track tutorial status
  // Start with sensible defaults that won't cause flickering
  // We default to "not showing" states until we explicitly confirm we should show
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(true); // Default to completed (hidden)
  const [tutorialEnabled, setTutorialEnabled] = useState(false); // Default to disabled
  
  const queryClient = useQueryClient();
  
  // Calculate total steps based on content configuration
  const getTotalSteps = useCallback((tabNameInput: string) => {
    // Normalize the input tab name for consistency in step count
    const normalized = normalizeTabName(tabNameInput);
    
    // Return the appropriate step count for each tab
    switch (normalized) {
      case 'claims':
        return 2; // Two steps in claims tutorial
      case 'network':
        return 3; // Three steps in network tutorial
      case 'file-vault':
        return 2; // Two steps in file vault tutorial
      case 'insights':
        return 3; // Three steps in insights tutorial
      case 'dashboard':
        return 3; // Three steps in dashboard tutorial
      case 'risk-score-configuration':
        return 3; // Three steps in risk score configuration tutorial
      default:
        return 3; // Default to 3 steps
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
  
  // State to track if we've tried initializing a new tutorial
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  
  // Function to initialize a new tutorial for this tab
  const initializeTutorial = useCallback(async () => {
    if (!isTutorialEnabledForTab(tabName) || initializationAttempted) {
      return;
    }
    
    logger.info(`Attempting to initialize tutorial for ${tabName}`);
    setInitializationAttempted(true);
    
    try {
      // Create the tutorial entry
      const result = await createTutorialEntry(tabName);
      
      if (result && result.success) {
        logger.info(`Successfully initialized tutorial for ${tabName}:`, result);
        // Invalidate the query to refetch with the new tutorial
        queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials/status', tabName] });
      } else {
        logger.warn(`Failed to initialize tutorial for ${tabName}:`, result);
      }
    } catch (error) {
      logger.error(`Error initializing tutorial for ${tabName}:`, error);
    }
  }, [tabName, initializationAttempted, queryClient]);

  // Update local state when data changes
  useEffect(() => {
    if (data) {
      logger.info(`Updating local state for ${tabName}:`, data);
      
      // Log the real step information from the database
      logger.info(`Real step information: currentStep=${data.currentStep}, totalSteps=${totalSteps}`);
      
      // Ensure we're using the exact value from the server
      // This will synchronize UI display with database values
      setCurrentStep(data.currentStep || 0);
      
      // IMPORTANT: Only update the "isCompleted" state if we have confirmed data
      // This prevents the tutorial from flickering when data is loading
      setIsCompleted(data.completed || false);
      
      // Now we can enable the tutorial - this should only happen AFTER we have data
      // and ONLY when certain conditions are met
      // This is the key change to avoid flickering
      if (!data.completed && data.exists) {
        logger.info(`Enabling tutorial for ${tabName} - tutorial exists and is not completed`);
        setTutorialEnabled(true);
      } else if (!data.exists && !initializationAttempted && isTutorialEnabledForTab(tabName)) {
        // If the tutorial doesn't exist yet but should be enabled for this tab,
        // initialize it automatically
        logger.info(`Tutorial for ${tabName} doesn't exist - initializing automatically`);
        initializeTutorial();
        // Don't enable yet - wait for the initialization and refetch
        setTutorialEnabled(false);
      } else {
        logger.info(`Not showing tutorial for ${tabName} - completed=${data.completed}, exists=${data.exists}`);
        setTutorialEnabled(false);
      }
    } else if (error) {
      logger.error(`Error in tutorial data for ${tabName}:`, error);
    }
  }, [data, error, tabName, totalSteps, initializeTutorial, initializationAttempted]);
  
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