/**
 * Sidebar State Management Hook - Global sidebar visibility control
 * 
 * Provides Zustand-based state management for sidebar collapse/expand
 * functionality across the application. Maintains persistent sidebar
 * state and enables consistent UI behavior for responsive design
 * and user preference management.
 * 
 * Features:
 * - Global sidebar state management with Zustand
 * - Toggle functionality for collapse/expand control
 * - TypeScript-safe state interface
 * - Persistent state across component remounts
 */

// ========================================
// IMPORTS
// ========================================

// External state management library
import { create } from 'zustand';

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Sidebar state interface for global UI management
 * Defines the structure and actions for sidebar visibility control
 */
interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Zustand store for global sidebar state management
 * 
 * Creates a global state store for sidebar visibility control with
 * toggle functionality. Provides consistent sidebar behavior across
 * all components and maintains state persistence throughout the
 * application lifecycle.
 * 
 * @returns Zustand store with sidebar state and toggle function
 */
export const useSidebarContext = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggle: (): void => set((state) => ({ isCollapsed: !state.isCollapsed }))
}));
