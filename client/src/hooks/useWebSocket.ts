import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '../lib/websocket';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleTaskUpdate = useCallback((data: any) => {
    // Invalidate the tasks query to trigger a refetch
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  }, [queryClient]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Subscribe to task updates
    const setupSubscription = async () => {
      try {
        unsubscribe = await wsService.subscribe('task_update', handleTaskUpdate);
      } catch (error) {
        console.error('[WebSocket] Subscription error:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to establish real-time connection. Updates may be delayed.',
          variant: 'destructive',
        });
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [queryClient, handleTaskUpdate, toast]);
}

export default useWebSocket;