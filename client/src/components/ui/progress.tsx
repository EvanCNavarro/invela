/**
 * Progress UI Component - Accessible progress indication system
 * 
 * Provides accessible progress component built on Radix UI primitives with
 * smooth animations and visual progress feedback. Optimized for indicating
 * completion status with design system integration and automatic accessibility
 * features including ARIA attributes and screen reader announcements.
 * 
 * Features:
 * - Radix UI Progress primitive for accessibility compliance
 * - Smooth CSS transition animations for progress changes
 * - Mathematical transform calculations for accurate progress display
 * - Design system color integration with primary/secondary themes
 * - Automatic ARIA progress attributes for screen readers
 * - Flexible sizing with overflow management
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible progress functionality
import * as ProgressPrimitive from "@radix-ui/react-progress";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Progress root styling classes for consistent indicator appearance
 * Defines container styling with overflow management and background theming
 */
const PROGRESS_ROOT_CLASSES = "relative h-4 w-full overflow-hidden rounded-full bg-secondary";

/**
 * Progress indicator styling classes for animated progress bar
 * Defines indicator appearance with smooth transitions and primary color
 */
const PROGRESS_INDICATOR_CLASSES = "h-full w-full flex-1 bg-primary transition-all";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Progress component properties interface
 * Extends Radix UI Progress primitive with styling options
 */
interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible progress component with smooth value transitions
 * 
 * Renders a fully accessible progress indicator with automatic ARIA attributes
 * and smooth visual transitions. Built on Radix UI primitives for optimal
 * screen reader support and accessibility compliance while maintaining
 * consistent design system styling and mathematical accuracy.
 * 
 * @param props Component properties including Radix UI Progress attributes
 * @param ref React ref for accessing the underlying progress element
 * @returns JSX element containing the accessible progress indicator
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(PROGRESS_ROOT_CLASSES, className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={PROGRESS_INDICATOR_CLASSES}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));

// Set display name from Radix UI primitive for React DevTools debugging
Progress.displayName = ProgressPrimitive.Root.displayName;

// ========================================
// EXPORTS
// ========================================

export { Progress };
