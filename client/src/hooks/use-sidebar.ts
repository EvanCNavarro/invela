import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  width: number;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setWidth: (width: number) => void;
}

// Default sidebar widths
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

/**
 * Store for managing sidebar state with persistence
 * Handles collapsing/expanding and width adjustments
 */
export const useSidebarContext = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      width: EXPANDED_WIDTH,
      
      // Toggle sidebar collapsed state
      toggle: () => set((state) => {
        const newIsCollapsed = !state.isCollapsed;
        return { 
          isCollapsed: newIsCollapsed,
          // Automatically adjust width based on collapsed state
          width: newIsCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
        };
      }),
      
      // Explicitly set collapsed state
      setCollapsed: (collapsed: boolean) => set(() => ({ 
        isCollapsed: collapsed,
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
      })),
      
      // Set custom width (with validation)
      setWidth: (width: number) => set(() => {
        // Ensure width is within reasonable bounds
        const validWidth = Math.max(COLLAPSED_WIDTH, Math.min(width, 400));
        return { width: validWidth };
      }),
    }),
    {
      name: 'sidebar-storage',
      // Only persist these fields
      partialize: (state) => ({ 
        isCollapsed: state.isCollapsed,
        width: state.width
      }),
      // Handle storage errors
      onRehydrateStorage: () => (state) => {
        if (!state) {
          console.warn('Failed to rehydrate sidebar state');
        }
      }
    }
  )
);

/**
 * Hook to get the current sidebar width based on state
 * @returns Current sidebar width in pixels
 */
export function useSidebarWidth(): number {
  return useSidebarContext((state) => state.width);
}

/**
 * Hook to get the current sidebar collapsed state
 * @returns Boolean indicating if sidebar is collapsed
 */
export function useSidebarCollapsed(): boolean {
  return useSidebarContext((state) => state.isCollapsed);
}
