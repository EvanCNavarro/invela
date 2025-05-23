/**
 * Popover UI Component Suite - Advanced floating content display system
 * 
 * Provides complete popover component system built on Radix UI primitives with
 * sophisticated portal rendering and positioning management. Optimized for
 * contextual content display with design system integration and comprehensive
 * accessibility features including keyboard navigation and focus management.
 * 
 * Features:
 * - Complete popover composition system (Root, Trigger, Content)
 * - Radix UI Popover primitives for accessibility compliance
 * - Advanced portal rendering for proper z-index layering
 * - Rich animation system with fade, zoom, and slide transitions
 * - Intelligent positioning with alignment and offset controls
 * - Design system popover color integration
 * - Configurable side offset and alignment options
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible popover functionality
import * as PopoverPrimitive from "@radix-ui/react-popover";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Popover content styling classes for floating panel appearance
 * Defines comprehensive styling including animations, positioning, and theme integration
 */
const POPOVER_CONTENT_CLASSES = "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

/**
 * Default alignment for popover content positioning
 * Provides consistent centered alignment relative to trigger
 */
const DEFAULT_CONTENT_ALIGNMENT = "center";

/**
 * Default side offset for popover positioning
 * Provides consistent spacing between trigger and popover content
 */
const DEFAULT_SIDE_OFFSET = 4;

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Popover root component for state management
 * Manages popover open/close state and interactions
 */
const Popover = PopoverPrimitive.Root;

/**
 * Popover trigger component for activation control
 * Element that triggers popover display on interaction
 */
const PopoverTrigger = PopoverPrimitive.Trigger;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Popover content component properties interface
 * Extends Radix UI Popover Content primitive with styling and positioning options
 */
interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Advanced popover content component with portal rendering and animations
 * 
 * Renders floating popover content with sophisticated positioning, animations,
 * and portal rendering for proper z-index management. Built on Radix UI
 * primitives for optimal accessibility while providing consistent design
 * system styling and responsive behavior with comprehensive focus management.
 * 
 * @param props Component properties including positioning and styling options
 * @param ref React ref for accessing the underlying popover content element
 * @returns JSX element containing the advanced floating popover content panel
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = DEFAULT_CONTENT_ALIGNMENT, sideOffset = DEFAULT_SIDE_OFFSET, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(POPOVER_CONTENT_CLASSES, className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
));

// Set display name from Radix UI primitive for React DevTools debugging
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

// ========================================
// EXPORTS
// ========================================

export { Popover, PopoverTrigger, PopoverContent };
