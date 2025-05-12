import { create } from 'zustand';
import { createTutorialLogger } from '@/lib/tutorial-logger';

const logger = createTutorialLogger('TutorialLoading');

/**
 * Tutorial loading state store
 * 
 * This store allows components to synchronize tutorial loading state
 * without tightly coupling the components or relying on prop drilling
 */
interface TutorialLoadingState {
  isLoading: boolean;
  currentTabName: string | null;
  setLoading: (isLoading: boolean, tabName: string | null) => void;
}

export const useTutorialLoadingStore = create<TutorialLoadingState>((set) => ({
  isLoading: false,
  currentTabName: null,
  setLoading: (isLoading, tabName) => {
    logger.debug(`Tutorial loading state changed: ${isLoading}${tabName ? ` (${tabName})` : ''}`);
    set({ isLoading, currentTabName: tabName });
  },
}));

/**
 * Hook to access tutorial loading state
 * 
 * This simplified hook is used by components that only need
 * to read the tutorial loading state, not modify it
 */
export function useTutorialLoading() {
  const { isLoading, currentTabName } = useTutorialLoadingStore();
  return { isLoading, currentTabName };
}