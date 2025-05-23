/**
 * Textarea UI Component - Multi-line text input foundation
 * 
 * Provides accessible textarea component with consistent styling and
 * behavior for multi-line text input scenarios. Built with React.forwardRef
 * for seamless form integration and optimized for user experience with
 * proper focus management, disability states, and design system integration.
 * 
 * Features:
 * - Comprehensive form integration with React.forwardRef support
 * - Accessible focus states with keyboard navigation optimization
 * - Design system color and spacing integration
 * - Disability and placeholder state styling
 * - Consistent sizing with minimum height constraints
 * - Professional input styling with border and background themes
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Base textarea styling classes for consistent form appearance
 * Defines comprehensive styling including focus states, accessibility, and theme integration
 */
const TEXTAREA_BASE_CLASSES = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Textarea component properties interface
 * Extends standard HTML textarea attributes for maximum form flexibility
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Multi-line textarea component with comprehensive form integration
 * 
 * Renders a fully accessible textarea element with consistent design system
 * styling and optimal user experience features. Includes proper focus management,
 * placeholder styling, disability states, and keyboard navigation support for
 * seamless form integration across the application.
 * 
 * @param props Component properties including standard HTML textarea attributes
 * @param ref React ref for accessing the underlying textarea element
 * @returns JSX element containing the styled and accessible textarea
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(TEXTAREA_BASE_CLASSES, className)}
        ref={ref}
        {...props}
      />
    );
  }
);

// Set display name for React DevTools debugging and development
Textarea.displayName = "Textarea";

// ========================================
// EXPORTS
// ========================================

export { Textarea };
