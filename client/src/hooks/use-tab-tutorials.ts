import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing tab tutorials
 * 
 * This hook handles checking tutorial completion status and marking tutorials as completed.
 * It provides an API for components to interact with the tab tutorial system.
 */
export function useTabTutorials() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get all completed tutorials for the current user
  const { 
    data: completedTutorials = [], 
    isLoading,
    error 
  } = useQuery<string[]>({
    queryKey: ['/api/user-tab-tutorials'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/user-tab-tutorials');
        const data = await response.json();
        return data.completedTutorials || [];
      } catch (error) {
        console.error('Error fetching completed tutorials:', error);
        return [];
      }
    }
  });

  // Check if a specific tutorial is completed
  const checkIfCompleted = useCallback((tabKey: string): boolean => {
    return completedTutorials.includes(tabKey);
  }, [completedTutorials]);
  
  // Mark a tutorial as completed
  const markTutorialCompletedMutation = useMutation({
    mutationFn: async (tabKey: string) => {
      const response = await apiRequest('/api/user-tab-tutorials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tabKey }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.completed) {
        // Invalidate queries to refetch
        queryClient.invalidateQueries({ queryKey: ['/api/user-tab-tutorials'] });
        
        toast({
          title: 'Tutorial completed',
          description: 'You can always revisit this tutorial from the help menu.',
        });
      }
    },
    onError: (error) => {
      console.error('Error marking tutorial as completed:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark tutorial as completed. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  const markTutorialCompleted = useCallback((tabKey: string) => {
    markTutorialCompletedMutation.mutate(tabKey);
  }, [markTutorialCompletedMutation]);
  
  return {
    completedTutorials,
    isLoading,
    error,
    checkIfCompleted,
    markTutorialCompleted,
    markingCompleted: markTutorialCompletedMutation.isPending
  };
}

export default useTabTutorials;