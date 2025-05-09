import { useTutorialWebSocket as useExistingTutorialWebSocket } from '@/services/websocket-service';

// Re-export the existing hook with the same interface for compatibility
export function useTutorialWebSocket(tabName: string) {
  return useExistingTutorialWebSocket(tabName);
}