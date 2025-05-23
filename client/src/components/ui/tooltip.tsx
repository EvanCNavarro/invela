/**
 * Tooltip UI Component Suite - Accessible contextual information system
 * 
 * Provides complete tooltip component system built on Radix UI primitives with
 * smooth animations and positioning management. Optimized for contextual help
 * and information display with design system integration and comprehensive
 * accessibility features including keyboard navigation and screen reader support.
 * 
 * Features:
 * - Complete tooltip composition system (Provider, Root, Trigger, Content)
 * - Radix UI Tooltip primitives for accessibility compliance
 * - Advanced animation system with fade and zoom transitions
 * - Intelligent positioning with side-aware slide animations
 * - Design system popover color integration
 * - Configurable side offset for precise positioning
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible tooltip functionality
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Tooltip content styling classes for consistent popup appearance
 * Defines comprehensive styling including animations, positioning, and theme integration
 */
const TOOLTIP_CONTENT_CLASSES = "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

/**
 * Default side offset for tooltip positioning
 * Provides consistent spacing between trigger and tooltip content
 */
const DEFAULT_SIDE_OFFSET = 4;

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Tooltip provider component for context management
 * Wraps tooltip functionality with necessary context providers
 */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tooltip root component for state management
 * Manages tooltip open/close state and interactions
 */
const Tooltip = TooltipPrimitive.Root;

/**
 * Tooltip trigger component for activation control
 * Element that triggers tooltip display on hover or focus
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Tooltip content component properties interface
 * Extends Radix UI Tooltip Content primitive with styling options
 */
interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible tooltip content component with advanced animations
 * 
 * Renders tooltip content with smooth fade and zoom animations, intelligent
 * positioning, and comprehensive accessibility features. Built on Radix UI
 * primitives for optimal screen reader support and keyboard navigation while
 * maintaining consistent design system styling and responsive behavior.
 * 
 * @param props Component properties including Radix UI Tooltip Content attributes
 * @param ref React ref for accessing the underlying tooltip content element
 * @returns JSX element containing the accessible tooltip content with animations
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = DEFAULT_SIDE_OFFSET, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(TOOLTIP_CONTENT_CLASSES, className)}
    {...props}
  />
));

// Set display name from Radix UI primitive for React DevTools debugging
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// ========================================
// EXPORTS
// ========================================

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
