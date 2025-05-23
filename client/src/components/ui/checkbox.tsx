/**
 * Checkbox UI Component - Accessible multi-selection form control
 * 
 * Provides accessible checkbox component built on Radix UI primitives with
 * visual check indicator and comprehensive keyboard navigation. Optimized for
 * multi-selection scenarios with design system integration and automatic
 * accessibility features including ARIA attributes and focus management.
 * 
 * Features:
 * - Radix UI Checkbox primitive for accessibility compliance
 * - Visual check indicator with Lucide React icon integration
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

// Radix UI primitive for accessible checkbox functionality
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

// Lucide React icon for visual check indicator
import { Check } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Checkbox root styling classes for consistent selection appearance
 * Defines comprehensive styling including focus states, transitions, and state management
 */
const CHECKBOX_ROOT_CLASSES = "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

/**
 * Checkbox indicator styling classes for check mark display
 * Defines indicator positioning and alignment within checkbox container
 */
const CHECKBOX_INDICATOR_CLASSES = "flex items-center justify-center text-current";

/**
 * Check icon styling classes for visual feedback
 * Defines icon size consistent with checkbox container dimensions
 */
const CHECK_ICON_CLASSES = "h-4 w-4";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Checkbox component properties interface
 * Extends Radix UI Checkbox primitive with styling options
 */
interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible checkbox component with visual check indicator
 * 
 * Renders a fully accessible checkbox with automatic keyboard navigation
 * and visual check feedback. Built on Radix UI primitives for optimal
 * screen reader support and accessibility compliance while maintaining
 * consistent design system styling and user experience patterns.
 * 
 * @param props Component properties including Radix UI Checkbox attributes
 * @param ref React ref for accessing the underlying checkbox element
 * @returns JSX element containing the accessible checkbox with check indicator
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(CHECKBOX_ROOT_CLASSES, className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(CHECKBOX_INDICATOR_CLASSES)}
    >
      <Check className={CHECK_ICON_CLASSES} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

// Set display name from Radix UI primitive for React DevTools debugging
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// ========================================
// EXPORTS
// ========================================

export { Checkbox };
