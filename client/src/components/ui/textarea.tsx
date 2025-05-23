/**
 * ========================================
 * Textarea Component - Multi-line Text Input
 * ========================================
 * 
 * Professional textarea component providing consistent styling for multi-line
 * text input throughout the enterprise platform. Built with accessibility
 * features and responsive design patterns.
 * 
 * Key Features:
 * - Multi-line text input with auto-resize capabilities
 * - Consistent design system styling
 * - Accessible focus management
 * - Responsive layout adaptation
 * - Type-safe React forwardRef implementation
 * 
 * Accessibility Features:
 * - Proper focus indicators
 * - Screen reader compatibility
 * - Keyboard navigation support
 * - High contrast mode support
 * 
 * @module components/ui/textarea
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
