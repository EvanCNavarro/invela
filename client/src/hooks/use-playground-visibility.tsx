import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useEffect } from 'react';

interface PlaygroundVisibilityState {
  isVisible: boolean;
  toggle: () => void;
  show: () => void;
  hide: () => void;
  // Add last visibility state before auto-hiding
  lastVisibleState: boolean;
  // Add method to restore last state
  restoreLastState: () => void;
}

/**
 * Store for managing playground visibility with persistence
 */
export const usePlaygroundVisibility = create<PlaygroundVisibilityState>()(
  persist(
    (set) => ({
      isVisible: true,
      lastVisibleState: true,
      
      toggle: () => set((state) => ({ 
        isVisible: !state.isVisible,
        // Update last visible state when manually toggling
        lastVisibleState: state.isVisible ? state.lastVisibleState : true
      })),
      
      show: () => set({ isVisible: true }),
      
      hide: () => set((state) => ({
        isVisible: false,
        // Store current state before hiding
        lastVisibleState: state.isVisible
      })),
      
      restoreLastState: () => set((state) => ({
        isVisible: state.lastVisibleState
      })),
    }),
    {
      name: 'playground-visibility-storage',
      // Only persist these fields
      partialize: (state) => ({ 
        isVisible: state.isVisible,
        lastVisibleState: state.lastVisibleState
      }),
    }
  )
);

/**
 * Hook that automatically hides playground on small screens
 * and restores visibility when screen size increases
 */
export function useResponsivePlayground() {
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const { isVisible, hide, restoreLastState } = usePlaygroundVisibility();
  
  // Auto-hide playground on small screens
  useEffect(() => {
    if (isSmallScreen && isVisible) {
      hide();
    } else if (!isSmallScreen && !isVisible) {
      restoreLastState();
    }
  }, [isSmallScreen, isVisible, hide, restoreLastState]);
  
  return { isVisible };
}

/**
 * Hook to get current playground visibility state
 * @returns Boolean indicating if playground is visible
 */
export function useIsPlaygroundVisible(): boolean {
  return usePlaygroundVisibility((state) => state.isVisible);
}
