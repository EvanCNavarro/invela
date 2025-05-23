/**
 * Separator UI Component - Accessible visual content divider
 * 
 * Provides semantically correct separator component built on Radix UI
 * primitives with automatic accessibility features and flexible orientation
 * support. Optimized for content organization and visual hierarchy with
 * design system integration and screen reader compatibility.
 * 
 * Features:
 * - Radix UI Separator primitive for accessibility compliance
 * - Horizontal and vertical orientation support
 * - Decorative and semantic separation modes
 * - Design system border color integration
 * - React.forwardRef support for layout composition
 * - Automatic ARIA attributes and screen reader optimization
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible separation
import * as SeparatorPrimitive from "@radix-ui/react-separator";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Base separator styling classes for consistent appearance
 * Defines foundation styling with border color and shrink behavior
 */
const SEPARATOR_BASE_CLASSES = "shrink-0 bg-border";

/**
 * Horizontal separator styling classes
 * Defines dimensions for horizontal content division
 */
const SEPARATOR_HORIZONTAL_CLASSES = "h-[1px] w-full";

/**
 * Vertical separator styling classes
 * Defines dimensions for vertical content division
 */
const SEPARATOR_VERTICAL_CLASSES = "h-full w-[1px]";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Separator component properties interface
 * Extends Radix UI Separator primitive with styling options
 */
interface SeparatorProps
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible separator component with orientation support
 * 
 * Renders a semantically correct separator element with automatic accessibility
 * features and flexible orientation options. Built on Radix UI primitives for
 * optimal screen reader support and content organization while maintaining
 * consistent design system styling and layout behavior.
 * 
 * @param props Component properties including Radix UI Separator attributes
 * @param ref React ref for accessing the underlying separator element
 * @returns JSX element containing the accessible separator with orientation support
 */
const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        SEPARATOR_BASE_CLASSES,
        orientation === "horizontal" 
          ? SEPARATOR_HORIZONTAL_CLASSES 
          : SEPARATOR_VERTICAL_CLASSES,
        className
      )}
      {...props}
    />
  )
);

// Set display name from Radix UI primitive for React DevTools debugging
Separator.displayName = SeparatorPrimitive.Root.displayName;

// ========================================
// EXPORTS
// ========================================

export { Separator };
