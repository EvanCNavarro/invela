/**
 * Slider UI Component - Accessible range input control system
 * 
 * Provides accessible slider component built on Radix UI primitives with
 * touch-optimized interactions and visual range feedback. Optimized for
 * value selection scenarios with design system integration and comprehensive
 * accessibility features including keyboard navigation and screen reader support.
 * 
 * Features:
 * - Radix UI Slider primitive for accessibility compliance
 * - Touch-optimized interactions with pointer event management
 * - Visual range indication with track and thumb components
 * - Design system color integration with primary/secondary themes
 * - Focus ring styling with proper offset management
 * - Disability state support with pointer event controls
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible slider functionality
import * as SliderPrimitive from "@radix-ui/react-slider";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Slider root styling classes for consistent container appearance
 * Defines container styling with touch optimization and layout management
 */
const SLIDER_ROOT_CLASSES = "relative flex w-full touch-none select-none items-center";

/**
 * Slider track styling classes for range background display
 * Defines track appearance with overflow management and secondary color
 */
const SLIDER_TRACK_CLASSES = "relative h-2 w-full grow overflow-hidden rounded-full bg-secondary";

/**
 * Slider range styling classes for active selection indicator
 * Defines range appearance with primary color and positioning
 */
const SLIDER_RANGE_CLASSES = "absolute h-full bg-primary";

/**
 * Slider thumb styling classes for interactive handle element
 * Defines thumb appearance with focus states and accessibility features
 */
const SLIDER_THUMB_CLASSES = "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Slider component properties interface
 * Extends Radix UI Slider primitive with styling options
 */
interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible slider component with touch-optimized interactions
 * 
 * Renders a fully accessible range input with automatic keyboard navigation
 * and touch-optimized interactions. Built on Radix UI primitives for optimal
 * screen reader support and accessibility compliance while maintaining
 * consistent design system styling and responsive behavior patterns.
 * 
 * @param props Component properties including Radix UI Slider attributes
 * @param ref React ref for accessing the underlying slider element
 * @returns JSX element containing the accessible slider with range controls
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(SLIDER_ROOT_CLASSES, className)}
    {...props}
  >
    <SliderPrimitive.Track className={SLIDER_TRACK_CLASSES}>
      <SliderPrimitive.Range className={SLIDER_RANGE_CLASSES} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={SLIDER_THUMB_CLASSES} />
  </SliderPrimitive.Root>
));

// Set display name from Radix UI primitive for React DevTools debugging
Slider.displayName = SliderPrimitive.Root.displayName;

// ========================================
// EXPORTS
// ========================================

export { Slider };
