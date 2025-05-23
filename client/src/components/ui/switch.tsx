/**
 * Switch UI Component - Accessible binary toggle control
 * 
 * Provides accessible switch component built on Radix UI primitives with
 * smooth animations and comprehensive keyboard navigation. Optimized for
 * binary state management with design system integration and automatic
 * accessibility features including ARIA attributes and focus management.
 * 
 * Features:
 * - Radix UI Switch primitive for accessibility compliance
 * - Smooth transition animations for state changes
 * - Comprehensive keyboard and mouse interaction support
 * - Design system color integration with checked/unchecked states
 * - Focus ring styling with proper offset management
 * - Disability state support with visual feedback
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible switch functionality
import * as SwitchPrimitives from "@radix-ui/react-switch";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Switch root styling classes for consistent toggle appearance
 * Defines comprehensive styling including focus states, transitions, and state management
 */
const SWITCH_ROOT_CLASSES = "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input";

/**
 * Switch thumb styling classes for animated toggle indicator
 * Defines thumb appearance with smooth position transitions
 */
const SWITCH_THUMB_CLASSES = "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Switch component properties interface
 * Extends Radix UI Switch primitive with styling options
 */
interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible switch component with smooth state transitions
 * 
 * Renders a fully accessible toggle switch with automatic keyboard navigation
 * and smooth visual transitions. Built on Radix UI primitives for optimal
 * screen reader support and accessibility compliance while maintaining
 * consistent design system styling and user experience patterns.
 * 
 * @param props Component properties including Radix UI Switch attributes
 * @param ref React ref for accessing the underlying switch element
 * @returns JSX element containing the accessible switch with toggle functionality
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(SWITCH_ROOT_CLASSES, className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(SWITCH_THUMB_CLASSES)}
    />
  </SwitchPrimitives.Root>
));

// Set display name from Radix UI primitive for React DevTools debugging
Switch.displayName = SwitchPrimitives.Root.displayName;

// ========================================
// EXPORTS
// ========================================

export { Switch };
