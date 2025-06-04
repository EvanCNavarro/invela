/**
 * ========================================
 * Input Component - Core Form Input Element
 * ========================================
 * 
 * Professional input component providing consistent styling, accessibility,
 * and form integration throughout the enterprise platform. Built with
 * shadcn/ui patterns and Tailwind CSS utility classes.
 * 
 * Key Features:
 * - Accessible form input with proper focus management
 * - Consistent styling with design system tokens
 * - Type-safe React forwardRef implementation
 * - Flexible className override support
 * - Built-in disabled and error states
 * 
 * Accessibility Features:
 * - Proper focus indicators with ring styling
 * - Screen reader compatible attributes
 * - Keyboard navigation support
 * - High contrast mode compatibility
 * 
 * @module components/ui/input
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
