/**
 * ========================================
 * Sidebar Hook - Navigation State Management
 * ========================================
 * 
 * Centralized sidebar state management hook providing consistent navigation
 * control throughout the enterprise platform. Manages sidebar collapse state
 * with Zustand for optimal performance and global state synchronization.
 * 
 * Key Features:
 * - Global sidebar state management with Zustand
 * - Collapse/expand toggle functionality
 * - Persistent state across component re-renders
 * - Type-safe state interface with strict typing
 * - Performance-optimized state updates
 * 
 * Sidebar State Management:
 * - Centralized collapse state for consistent UI behavior
 * - Toggle functionality for responsive navigation
 * - Cross-component state synchronization
 * - Efficient re-rendering with selective subscriptions
 * - Enterprise-grade navigation state patterns
 * 
 * @module hooks/use-sidebar
 * @version 1.0.0
 * @since 2025-05-23
 */

import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
}

export const useSidebarContext = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}));
