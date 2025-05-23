/**
 * Label UI Component - Accessible form labeling with peer state awareness
 * 
 * Provides semantically correct form labeling component built on Radix UI
 * primitives with automatic accessibility features and peer element state
 * management. Optimized for form validation feedback and disabled state
 * handling with consistent design system integration.
 * 
 * Features:
 * - Radix UI Label primitive for accessibility compliance
 * - Peer element state awareness (disabled cursor and opacity)
 * - Class-variance-authority integration for consistent styling
 * - React.forwardRef support for form library integration
 * - Automatic ARIA labeling and screen reader optimization
 * - Design system typography and spacing integration
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible labeling
import * as LabelPrimitive from "@radix-ui/react-label";

// External styling utilities for variant management
import { cva, type VariantProps } from "class-variance-authority";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// STYLING CONFIGURATION
// ========================================

/**
 * Label component styling variants using class-variance-authority
 * Defines consistent typography and peer state management
 */
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Label component properties interface
 * Extends Radix UI Label primitive with variant styling options
 */
interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible label component with peer state management
 * 
 * Renders a semantically correct label element with automatic accessibility
 * features and peer element state awareness. Built on Radix UI primitives
 * for optimal screen reader support and form validation integration while
 * maintaining consistent design system styling.
 * 
 * @param props Component properties including Radix UI Label attributes
 * @param ref React ref for accessing the underlying label element
 * @returns JSX element containing the accessible label with peer state handling
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));

// Set display name from Radix UI primitive for React DevTools debugging
Label.displayName = LabelPrimitive.Root.displayName;

// ========================================
// EXPORTS
// ========================================

export { Label };
