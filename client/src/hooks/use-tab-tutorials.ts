import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface UserTabTutorialStatus {
  tabName: string;
  userId: number;
  completed: boolean;
  lastSeenAt: string | null;
  currentStep: number;
}

interface UseTabTutorialsResult {
  tutorialEnabled: boolean;
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  isLoading: boolean;
  handleNext: () => void;
  handleComplete: () => void;
  markTutorialSeen: () => void;
}

/**
 * Hook to manage tab-specific tutorials
 * 
 * This hook handles the state and progression of tab-specific tutorials,
 * keeping track of which steps have been completed and syncing with the server.
 * 
 * @param tabName - The unique identifier for the tab
 * @returns Object with tutorial state and control functions
 */
export function useTabTutorials(tabName: string): UseTabTutorialsResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  // Get tutorial status from the server
  const { data: tutorialStatus, isLoading: isStatusLoading } = useQuery<UserTabTutorialStatus>({
    queryKey: ['tutorials', tabName],
    queryFn: async () => {
      const response = await apiRequest(`/api/user-tab-tutorials/${tabName}/status`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch tutorial status');
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Update tutorial status on the server
  const updateTutorialMutation = useMutation({
    mutationFn: async (data: Partial<UserTabTutorialStatus>) => {
      const response = await apiRequest('/api/user-tab-tutorials', {
        method: 'POST',
        body: JSON.stringify({
          tabName,
          ...data
        }),
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to update tutorial status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials', tabName] });
    },
    onError: (error) => {
      console.error('Error updating tutorial status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tutorial progress',
        variant: 'destructive',
      });
    },
  });

  // Set the current step from the server data
  useEffect(() => {
    if (tutorialStatus && !isStatusLoading) {
      setCurrentStep(tutorialStatus.currentStep || 0);
    }
  }, [tutorialStatus, isStatusLoading]);

  // Calculate total steps based on tab type (hardcoded for simplicity)
  const getTotalSteps = useCallback(() => {
    switch (tabName) {
      case 'risk-score':
        return 5;
      case 'claims-risk':
        return 4;
      default:
        return 3; // Default number of steps
    }
  }, [tabName]);

  // Handle advancing to the next step
  const handleNext = useCallback(() => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    updateTutorialMutation.mutate({ currentStep: nextStep });
  }, [currentStep, updateTutorialMutation]);

  // Handle completing the tutorial
  const handleComplete = useCallback(() => {
    updateTutorialMutation.mutate({ 
      completed: true,
      lastSeenAt: new Date().toISOString()
    });
  }, [updateTutorialMutation]);

  // Handle skipping the tutorial
  const markTutorialSeen = useCallback(() => {
    updateTutorialMutation.mutate({ 
      lastSeenAt: new Date().toISOString()
    });
  }, [updateTutorialMutation]);

  // Determine if the tutorial should be shown
  const shouldShowTutorial = useCallback(() => {
    if (isStatusLoading) return false;
    if (!tutorialStatus) return true; // Show if no status exists
    
    // Show if not completed and hasn't been seen recently
    return !tutorialStatus.completed;
  }, [tutorialStatus, isStatusLoading]);

  return {
    tutorialEnabled: shouldShowTutorial(),
    currentStep,
    totalSteps: getTotalSteps(),
    isCompleted: tutorialStatus?.completed || false,
    isLoading: isStatusLoading,
    handleNext,
    handleComplete,
    markTutorialSeen,
  };
}