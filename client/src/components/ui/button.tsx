/**
 * Button UI Component - Versatile interactive element foundation
 * 
 * Provides comprehensive button component with multiple visual variants,
 * sizing options, and advanced composition patterns. Built with Radix UI
 * primitives and class-variance-authority for consistent styling across
 * the application with full accessibility and keyboard navigation support.
 * 
 * Features:
 * - Multiple visual variants (default, destructive, outline, secondary, ghost, link)
 * - Flexible sizing system (default, sm, lg, icon)
 * - Radix UI Slot integration for advanced composition patterns
 * - React.forwardRef support for ref forwarding
 * - Full accessibility with ARIA states and focus management
 * - SVG icon optimization with consistent sizing
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for advanced composition patterns
import { Slot } from "@radix-ui/react-slot";

// External styling utilities for variant management
import { cva, type VariantProps } from "class-variance-authority";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// STYLING CONFIGURATION
// ========================================

/**
 * Button component styling variants using class-variance-authority
 * Defines comprehensive visual styles and sizing options for all button types
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-normal break-words rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-9 rounded-md px-3",
        lg: "min-h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Button component properties interface
 * Extends HTML button attributes with variant styling and composition options
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Enable Radix UI Slot composition for advanced component patterns */
  asChild?: boolean;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Versatile button component with advanced composition support
 * 
 * Renders a fully accessible button with configurable visual variants,
 * sizing options, and advanced composition patterns through Radix UI Slot.
 * Supports ref forwarding and provides consistent styling across all
 * interaction states including hover, focus, and disabled.
 * 
 * @param props Component properties including variant, size, and HTML attributes
 * @param ref React ref for accessing the underlying button element
 * @returns JSX element containing the styled button with advanced capabilities
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

// Set display name for React DevTools debugging
Button.displayName = "Button";

// ========================================
// EXPORTS
// ========================================

export { Button, buttonVariants };