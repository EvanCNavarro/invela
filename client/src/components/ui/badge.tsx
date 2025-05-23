/**
 * Badge UI Component - Flexible status and label indicators
 * 
 * Provides reusable badge component with multiple visual variants for
 * displaying status information, categories, and labels throughout the
 * application. Built with class-variance-authority for consistent styling
 * and optimal performance with configurable appearance options.
 * 
 * Features:
 * - Multiple visual variants (default, secondary, destructive, outline)
 * - Accessible focus states with keyboard navigation
 * - Hover interactions for enhanced user experience
 * - Flexible content support for text and icons
 * - Theme-aware styling with design system integration
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality
import * as React from "react";

// External styling utilities for variant management
import { cva, type VariantProps } from "class-variance-authority";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// STYLING CONFIGURATION
// ========================================

/**
 * Badge component styling variants using class-variance-authority
 * Defines consistent visual styles for different badge types and states
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Badge component properties interface
 * Extends HTML div attributes with variant styling options
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Versatile badge component for status and label display
 * 
 * Renders a styled badge with configurable visual variants suitable
 * for status indicators, category labels, and informational tags.
 * Supports full accessibility with focus states and hover interactions
 * while maintaining design system consistency.
 * 
 * @param props Component properties including variant and HTML attributes
 * @returns JSX element containing the styled badge
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// ========================================
// EXPORTS
// ========================================

export { Badge, badgeVariants };
