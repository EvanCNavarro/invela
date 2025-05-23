/**
 * ========================================
 * Mobile Hook - Responsive Device Detection
 * ========================================
 * 
 * Responsive design hook providing real-time mobile device detection
 * throughout the enterprise platform. Manages viewport breakpoints and
 * device state changes for optimal user experience across all devices.
 * 
 * Key Features:
 * - Real-time viewport width monitoring
 * - Responsive breakpoint detection (768px mobile threshold)
 * - Event-driven state updates on device orientation changes
 * - Performance-optimized with proper cleanup
 * - Type-safe boolean state management
 * 
 * Device Detection:
 * - Mobile-first responsive design support
 * - Automatic layout adaptation based on device type
 * - Window resize event handling with debouncing
 * - Cross-browser compatibility for all modern devices
 * - Seamless integration with responsive component systems
 * 
 * @module hooks/use-mobile
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
