import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
 * and provides methods to update tutorial progress
 */
export function useTabTutorials(tabName: string) {
  // Local state to track tutorial status
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Calculate total steps - this would normally come from the content config
  const getTotalSteps = useCallback((tabNameInput: string) => {
    switch (tabNameInput) {
      case 'risk-score':
        return 5;
      case 'claims-risk':
        return 4;
      default:
        return 5;
    }
  }, []);
  
  const totalSteps = getTotalSteps(tabName);
  
  console.log(`[TabTutorials] Initializing for tab: ${tabName}`);
  
  // Fetch tutorial status from the server
  const { data, isLoading, error } = useQuery<TutorialStatus>({
    queryKey: ['/api/user-tab-tutorials/status', tabName],
    queryFn: async (): Promise<TutorialStatus> => {
      console.log(`[TabTutorials] Fetching tutorial status for: ${tabName}`);
      try {
        const result = await apiRequest(`/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`);
        console.log(`[TabTutorials] Received tutorial status for ${tabName}:`, result);
        return result as TutorialStatus;
      } catch (err) {
        console.error(`[TabTutorials] Error fetching tutorial status for ${tabName}:`, err);
        throw err;
      }
    }
  });
  
  // Update tutorial progress mutation
  const updateTutorialMutation = useMutation({
    mutationFn: async (payload: { step: number, completed: boolean }) => {
      console.log(`[TabTutorials] Updating tutorial for ${tabName}:`, payload);
      
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
      console.log(`[TabTutorials] Successfully updated tutorial for ${tabName}:`, result);
      // Invalidate tutorial status after update
      queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials/status', tabName] });
    },
    onError: (error) => {
      console.error(`[TabTutorials] Error updating tutorial for ${tabName}:`, error);
    }
  });
  
  // Mark tutorial as seen mutation (for "Skip" functionality)
  const markSeenMutation = useMutation({
    mutationFn: async () => {
      console.log(`[TabTutorials] Marking tutorial as seen for ${tabName}`);
      
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
      console.log(`[TabTutorials] Successfully marked tutorial as seen for ${tabName}:`, result);
      // Invalidate tutorial status after update
      queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials/status', tabName] });
    },
    onError: (error) => {
      console.error(`[TabTutorials] Error marking tutorial as seen for ${tabName}:`, error);
    }
  });
  
  // Update local state when data changes
  useEffect(() => {
    if (data) {
      console.log(`[TabTutorials] Updating local state for ${tabName}:`, data);
      
      // Log the real step information from the database
      console.log(`[TabTutorials] Real step information: currentStep=${data.currentStep}, totalSteps=${totalSteps}`);
      
      // Ensure we're using the exact value from the server
      // This will synchronize UI display with database values
      setCurrentStep(data.currentStep || 0);
      setIsCompleted(data.completed || false);
      setTutorialEnabled(true);
    } else if (error) {
      console.error(`[TabTutorials] Error in tutorial data for ${tabName}:`, error);
    }
  }, [data, error, tabName, totalSteps]);
  
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
    console.log(`[TabTutorials] Completing tutorial for ${tabName}`);
    setIsCompleted(true);
    updateTutorialMutation.mutate({ step: currentStep, completed: true });
  }, [currentStep, updateTutorialMutation, tabName]);
  
  // Mark tutorial as seen (Skip)
  const markTutorialSeen = useCallback(() => {
    console.log(`[TabTutorials] Skipping tutorial for ${tabName}`);
    markSeenMutation.mutate();
  }, [markSeenMutation, tabName]);
  
  // Log the current state on every render
  console.log(`[TabTutorials] Current state for ${tabName}:`, {
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
    markTutorialSeen
  };
}