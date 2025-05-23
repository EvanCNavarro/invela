/**
 * Input UI Component - Foundation form input element
 * 
 * Provides accessible and styled input component with comprehensive
 * design system integration and full keyboard navigation support.
 * Built with React.forwardRef for seamless integration with form
 * libraries and optimized for all input types and file handling.
 * 
 * Features:
 * - Full HTML input attribute support
 * - Design system color and spacing integration
 * - Accessible focus states with ring indicators
 * - File input styling optimization
 * - Disabled state handling with visual feedback
 * - React.forwardRef support for form library integration
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Input component properties interface
 * Extends all standard HTML input attributes for maximum flexibility
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// ========================================
// CONSTANTS
// ========================================

/**
 * Base styling classes for consistent input appearance
 * Defines comprehensive styling including states and file handling
 */
const INPUT_BASE_CLASSES = 
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Versatile input component with comprehensive styling and accessibility
 * 
 * Renders a fully accessible input field with design system integration,
 * optimized focus states, and support for all HTML input types including
 * file inputs. Provides consistent styling across all interaction states
 * and seamless integration with form validation libraries.
 * 
 * @param props Component properties including all HTML input attributes
 * @param ref React ref for accessing the underlying input element
 * @returns JSX element containing the styled input with full functionality
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(INPUT_BASE_CLASSES, className)}
        ref={ref}
        {...props}
      />
    );
  }
);

// Set display name for React DevTools debugging
Input.displayName = "Input";

// ========================================
// EXPORTS
// ========================================

export { Input };
