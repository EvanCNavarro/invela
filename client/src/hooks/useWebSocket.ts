import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '../lib/websocket';

export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to task updates
    const unsubscribe = wsService.subscribe('task_update', (data) => {
      // Invalidate the tasks query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [queryClient]);
}

export default useWebSocket;