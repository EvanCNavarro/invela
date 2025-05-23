/**
 * ========================================
 * Alert Component System - Status Notifications
 * ========================================
 * 
 * Professional alert component system providing consistent status notifications
 * and contextual feedback throughout the enterprise platform. Built with
 * class-variance-authority for type-safe variant management and accessibility.
 * 
 * Key Features:
 * - Multiple alert variants (default, destructive)
 * - Icon integration with proper positioning
 * - Accessible alert structure with ARIA attributes
 * - Consistent styling with design system tokens
 * - Type-safe variant system
 * 
 * Alert Components:
 * - Alert: Main alert container with variant support
 * - AlertTitle: Bold alert heading component
 * - AlertDescription: Alert content description
 * 
 * Alert Variants:
 * - Default: Standard informational alerts
 * - Destructive: Error and warning alerts
 * 
 * @module components/ui/alert
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
