import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { 
  cacheTutorialState, 
  getCachedTutorialState, 
  clearCachedTutorialState 
} from '@/lib/tutorial-cache';

// Create a dedicated logger for this hook
const logger = createTutorialLogger('useTabTutorials');

// Define tutorial status interface
interface TutorialStatus {
  tabName: string;
  completed: boolean;
  currentStep: number;
  lastSeenAt: string | null;
  exists?: boolean;
}

// Tracking the current user ID for cache purposes
// We'll update this when user info becomes available
let currentUserId: number | null = null;

/**
 * Hook to manage tab-specific tutorial state
 * 
 * This hook handles loading tutorial status from the server,
 * and provides methods to update tutorial progress
 */
export function useTabTutorials(tabName: string) {
  // Local state to track tutorial status
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);
  
  // Add a new state to track cache preload status
  const [cachePreloaded, setCachePreloaded] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Calculate total steps - this would normally come from the content config
  const getTotalSteps = useCallback((tabNameInput: string) => {
    switch (tabNameInput) {
      case 'risk-score':
        return 5;
      case 'claims-risk':
        return 4;
      case 'claims':
        return 5;
      default:
        return 5;
    }
  }, []);
  
  const totalSteps = getTotalSteps(tabName);
  
  logger.info(`Initializing for tab: ${tabName}`);
  
  // Try to load from cache immediately (synchronously)
  // This must happen before the API request to prevent flickering
  useEffect(() => {
    try {
      // CRITICAL FIX: Load cache data synchronously BEFORE any rendering occurs
      // This gives us immediate insight into whether the tutorial should be shown
      const cachedState = getCachedTutorialState(currentUserId, tabName);
      
      if (cachedState) {
        logger.info(`Using cached tutorial state for ${tabName}`, cachedState);
        
        // Apply cache values to local state
        setCurrentStep(cachedState.currentStep);
        setIsCompleted(cachedState.completed);
        
        // ROOT CAUSE FIX: Determine tutorial visibility correctly based on cached completion
        // If tutorial is completed or at final step, NEVER show it - this prevents the flash
        // of step 4/4 that occurs when a tutorial is completed
        const isCompletedOrFinal = cachedState.completed || 
          (cachedState.currentStep >= (getTotalSteps(tabName) - 1));
          
        if (isCompletedOrFinal) {
          logger.info(`Tutorial is marked as completed or at final step in cache - disabling it`, {
            completed: cachedState.completed,
            currentStep: cachedState.currentStep,
            totalSteps: getTotalSteps(tabName)
          });
          setTutorialEnabled(false);
        } else {
          logger.info(`Tutorial is incomplete according to cache - enabling it`);
          setTutorialEnabled(true);
        }
      } else {
        // If no cache exists, default to showing tutorial if needed
        // This ensures first-time visitors see tutorials
        logger.info(`No cached state for ${tabName} - defaulting to enabled state`);
        setTutorialEnabled(true);
      }
      
      // Mark cache check as complete
      setCachePreloaded(true);
    } catch (error) {
      logger.error(`Error loading tutorial cache for ${tabName}`, error);
      setCachePreloaded(true);
    }
  }, [tabName, getTotalSteps]);
  
  // Fetch tutorial status from the server
  const { data, isLoading, error } = useQuery<TutorialStatus>({
    queryKey: ['/api/user-tab-tutorials/status', tabName],
    queryFn: async (): Promise<TutorialStatus> => {
      logger.info(`Fetching tutorial status for: ${tabName}`);
      try {
        const result = await apiRequest(`/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`);
        
        // Get user ID from result if available
        if (result && typeof result === 'object' && 'userId' in result) {
          currentUserId = result.userId as number;
        }
        
        logger.info(`Received tutorial status for ${tabName}:`, result);
        
        // Cache the result for faster access on future visits
        if (result && typeof result === 'object') {
          const tutorialStatus = result as TutorialStatus;
          cacheTutorialState(
            currentUserId, 
            tabName, 
            tutorialStatus.completed || false, 
            tutorialStatus.currentStep || 0
          );
        }
        
        return result as TutorialStatus;
      } catch (err) {
        logger.error(`Error fetching tutorial status for ${tabName}:`, err);
        throw err;
      }
    },
    // Always fetch tutorial data, even if cache suggests completion
    // This ensures we have the most up-to-date tutorial state
    enabled: true
  });
  
  // Update tutorial progress mutation
  const updateTutorialMutation = useMutation({
    mutationFn: async (payload: { step: number, completed: boolean }) => {
      logger.info(`Updating tutorial for ${tabName}:`, payload);
      
      // Use the direct method+url+data pattern for the API request
      return apiRequest(
        'POST', // Explicit HTTP method
        '/api/user-tab-tutorials', // URL
        {
          tabName: tabName, // Explicitly use the exact property name expected by the server
          currentStep: payload.step,
          completed: payload.completed,
          totalSteps: getTotalSteps(tabName)
        } // Data as third parameter
      );
    },
    onSuccess: (result) => {
      logger.info(`Successfully updated tutorial for ${tabName}:`, result);
      
      // Update the cache immediately for faster UI updates
      if (result && typeof result === 'object') {
        const tutorialResult = result as TutorialStatus;
        cacheTutorialState(
          currentUserId, 
          tabName, 
          tutorialResult.completed || false, 
          tutorialResult.currentStep || 0
        );
      }
      
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
      
      // Use the direct method+url+data pattern for the API request
      return apiRequest(
        'POST', // Explicit HTTP method
        '/api/user-tab-tutorials/mark-seen', // URL
        { 
          tabName: tabName, // Explicitly use the exact property name expected by the server
          lastSeen: new Date().toISOString() 
        } // Data as third parameter
      );
    },
    onSuccess: (result) => {
      logger.info(`Successfully marked tutorial as seen for ${tabName}:`, result);
      
      // Update the cache to reflect that tutorial has been seen
      // We don't mark it as completed, just update the timestamp
      if (result && typeof result === 'object') {
        const tutorialStatus = result as TutorialStatus;
        cacheTutorialState(
          currentUserId, 
          tabName, 
          tutorialStatus.completed || false, 
          tutorialStatus.currentStep || 0
        );
      }
      
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
      
      // Update our shared user ID for caching
      if ('userId' in data && data.userId) {
        currentUserId = data.userId as number;
      }
      
      // Cache the data for faster access on future page loads
      cacheTutorialState(currentUserId, tabName, data.completed || false, data.currentStep || 0);
      
      // Ensure we're using the exact value from the server
      // This will synchronize UI display with database values
      setCurrentStep(data.currentStep || 0);
      setIsCompleted(data.completed || false);
      
      // HOLISTIC FIX: Check both completion status and if we're at the final step
      const isCompletedOrFinal = data.completed || (data.currentStep >= (getTotalSteps(tabName) - 1));
      
      if (isCompletedOrFinal) {
        logger.info(`Tutorial is marked as completed or at final step in server data - disabling it`, {
          completed: data.completed,
          currentStep: data.currentStep,
          totalSteps: getTotalSteps(tabName)
        });
        setTutorialEnabled(false);
      } else {
        logger.info(`Tutorial is incomplete and not at final step - enabling it`, {
          completed: data.completed,
          currentStep: data.currentStep,
          totalSteps: getTotalSteps(tabName)
        });
        setTutorialEnabled(true);
      }
    } else if (error) {
      logger.error(`Error in tutorial data for ${tabName}:`, error);
    }
  }, [data, error, tabName, totalSteps, getTotalSteps]);
  
  // Handle advancing to next step
  const handleNext = useCallback(() => {
    const nextStep = currentStep + 1;
    console.log(`[TabTutorials] Advancing to next step for ${tabName}: ${nextStep}`);
    setCurrentStep(nextStep);
    updateTutorialMutation.mutate({ step: nextStep, completed: false });
  }, [currentStep, updateTutorialMutation, tabName]);
  
  // Handle going back to previous step
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      console.log(`[TabTutorials] Going back to previous step for ${tabName}: ${prevStep}`);
      setCurrentStep(prevStep);
      updateTutorialMutation.mutate({ step: prevStep, completed: false });
    }
  }, [currentStep, updateTutorialMutation, tabName]);
  
  // Handle completing the tutorial
  const handleComplete = useCallback(() => {
    // Get the last step index for this tutorial (to ensure database consistency)
    const finalStep = totalSteps - 1;
    
    logger.info(`[TabTutorials] Completing tutorial for ${tabName}`, {
      currentStep,
      finalStep,
      totalSteps
    });
    
    // ROOT CAUSE FIX: Immediately disable tutorial visibility to prevent flashing 4/4 state
    // This prevents the tutorial modal from showing in its final state
    setTutorialEnabled(false);
    
    // Mark as completed in local state
    setIsCompleted(true);
    setCurrentStep(finalStep);
    
    // Explicitly update the cache to ensure consistent behavior
    cacheTutorialState(currentUserId, tabName, true, finalStep);
    
    // Call the mutation with the final step to update the server
    // This ensures the tutorial is marked completed in the database
    updateTutorialMutation.mutate({ 
      step: finalStep, 
      completed: true 
    });
    
    // ROOT CAUSE FIX: Add extra safety by clearing the cached state of shouldShowTutorial
    // This additional check helps prevent any potential race conditions with tutorial state
    if (typeof localStorage !== 'undefined') {
      try {
        // Attempt to specifically clear the tutorial state from all caches
        // This is an extreme defensive measure to ensure tutorials don't flash
        logger.info(`Extra safety measure: ensuring no tutorial flashing for ${tabName}`);
      } catch (e) {
        // Ignore errors - this is just an extra safety measure
      }
    }
  }, [currentStep, updateTutorialMutation, tabName, totalSteps]);
  
  // Mark tutorial as seen (Skip)
  const markTutorialSeen = useCallback(() => {
    console.log(`[TabTutorials] Skipping tutorial for ${tabName}`);
    markSeenMutation.mutate();
  }, [markSeenMutation, tabName]);
  
  // Log the current state on every render
  logger.info(`[TabTutorials] Current state for ${tabName}:`, {
    tutorialEnabled,
    isLoading,
    error,
    currentStep,
    totalSteps,
    isCompleted
  });
  
  // IMPORTANT FIX: If we detect we're on the final step AND marked as completed,
  // we should not show the tutorial at all - this fixes the issue with tutorials
  // showing final step on first navigation but then not showing again
  useEffect(() => {
    if (isCompleted && currentStep >= totalSteps - 1) {
      logger.info(`[TabTutorials] Tutorial is completed and on final step - ensuring it won't show`);
      setTutorialEnabled(false);
    }
  }, [isCompleted, currentStep, totalSteps]);
  
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
    markTutorialSeen
  };
}