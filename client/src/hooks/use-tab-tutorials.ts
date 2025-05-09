import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Define tutorial status interface
interface TutorialStatus {
  tabName: string;
  completed: boolean;
  currentStep: number;
  lastSeenAt: string | null;
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
  
  // Fetch tutorial status from the server
  const { data, isLoading, error } = useQuery<TutorialStatus>({
    queryKey: ['/api/user-tab-tutorials/status', tabName],
    queryFn: async () => {
      return apiRequest(`/api/user-tab-tutorials/${encodeURIComponent(tabName)}/status`);
    }
  });
  
  // Update tutorial progress mutation
  const updateTutorialMutation = useMutation({
    mutationFn: async (payload: { step: number, completed: boolean }) => {
      return apiRequest('/api/user-tab-tutorials', {
        method: 'POST',
        body: JSON.stringify({
          tabName,
          currentStep: payload.step,
          completed: payload.completed,
          totalSteps: getTotalSteps(tabName)
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      // Invalidate tutorial status after update
      queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials/status', tabName] });
    }
  });
  
  // Mark tutorial as seen mutation (for "Skip" functionality)
  const markSeenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/user-tab-tutorials', {
        method: 'POST',
        body: JSON.stringify({ 
          tabName,
          lastSeen: new Date().toISOString() 
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      // Invalidate tutorial status after update
      queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials/status', tabName] });
    }
  });
  
  // Update local state when data changes
  useEffect(() => {
    if (data) {
      setCurrentStep(data.currentStep || 0);
      setIsCompleted(data.completed || false);
      setTutorialEnabled(true);
    }
  }, [data]);
  
  // Handle advancing to next step
  const handleNext = useCallback(() => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    updateTutorialMutation.mutate({ step: nextStep, completed: false });
  }, [currentStep, updateTutorialMutation]);
  
  // Handle completing the tutorial
  const handleComplete = useCallback(() => {
    setIsCompleted(true);
    updateTutorialMutation.mutate({ step: currentStep, completed: true });
  }, [currentStep, updateTutorialMutation]);
  
  // Mark tutorial as seen (Skip)
  const markTutorialSeen = useCallback(() => {
    markSeenMutation.mutate();
  }, [markSeenMutation]);
  
  // Calculate total steps - this would normally come from the content config
  const getTotalSteps = (tabNameInput: string) => {
    switch (tabNameInput) {
      case 'risk-score':
        return 5;
      case 'claims-risk':
        return 4;
      default:
        return 5;
    }
  };
  
  const totalSteps = getTotalSteps(tabName);
  
  return {
    tutorialEnabled,
    isLoading,
    error,
    currentStep,
    totalSteps,
    isCompleted,
    handleNext,
    handleComplete,
    markTutorialSeen
  };
}