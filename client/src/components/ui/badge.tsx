/**
 * ========================================
 * Badge Component - Status & Label Indicators
 * ========================================
 * 
 * Professional badge component system providing consistent status indicators,
 * labels, and categorical tags throughout the enterprise platform. Built with
 * class-variance-authority for type-safe variant management.
 * 
 * Key Features:
 * - Multiple badge variants (default, secondary, destructive, outline)
 * - Type-safe variant system with consistent styling
 * - Accessible focus management with ring indicators
 * - Hover states for interactive badges
 * - Consistent typography and spacing
 * 
 * Badge Variants:
 * - Default: Primary brand color for standard indicators
 * - Secondary: Neutral color for secondary information
 * - Destructive: Error/warning states for critical indicators
 * - Outline: Minimal style for subtle labeling
 * 
 * @module components/ui/badge
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

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
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
