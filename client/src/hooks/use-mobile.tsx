/**
 * Mobile Responsiveness Detection Hook - Dynamic viewport size monitoring
 * 
 * Provides React hook for detecting mobile device viewports with real-time
 * responsiveness monitoring. Implements efficient media query listeners
 * for dynamic UI adaptation and responsive design implementation across
 * components requiring mobile-specific behavior.
 * 
 * Features:
 * - Real-time viewport size monitoring
 * - Efficient media query event listeners
 * - TypeScript-safe boolean state management
 * - Automatic cleanup and memory management
 */

// ========================================
// IMPORTS
// ========================================

// React core hooks for state and lifecycle management
import { useState, useEffect } from 'react';

// ========================================
// CONSTANTS
// ========================================

/**
 * Mobile breakpoint threshold in pixels
 * Standard responsive design breakpoint for mobile device detection
 */
const MOBILE_VIEWPORT_BREAKPOINT = 768;

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * React hook for dynamic mobile viewport detection
 * 
 * Monitors viewport width changes and provides real-time mobile device
 * detection for responsive UI components. Uses efficient media query
 * listeners to minimize performance impact while ensuring accurate
 * mobile state tracking across viewport changes.
 * 
 * @returns Boolean indicating if current viewport matches mobile breakpoint
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Create media query for mobile breakpoint detection
    const mediaQueryList = window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_BREAKPOINT - 1}px)`);
    
    /**
     * Handle viewport size changes for mobile detection
     * Updates mobile state when viewport crosses breakpoint threshold
     */
    const handleViewportChange = (): void => {
      setIsMobile(window.innerWidth < MOBILE_VIEWPORT_BREAKPOINT);
    };
    
    // Set initial mobile state
    handleViewportChange();
    
    // Register media query listener for dynamic updates
    mediaQueryList.addEventListener('change', handleViewportChange);
    
    // Cleanup function for memory management
    return (): void => {
      mediaQueryList.removeEventListener('change', handleViewportChange);
    };
  }, []);

  return Boolean(isMobile);
}
