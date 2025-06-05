/**
 * ========================================
 * Skeleton UI Component - Loading States
 * ========================================
 * 
 * Professional loading skeleton component providing smooth content
 * placeholder animations during data fetching operations. Implements
 * accessible loading states with consistent visual design patterns.
 * 
 * Key Features:
 * - Smooth pulse animation for loading feedback
 * - Accessible loading state indication
 * - Flexible sizing and responsive design
 * - Professional styling with muted color scheme
 * - Consistent with shadcn/ui design system
 * 
 * Use Cases:
 * - Dashboard widget loading states
 * - Form field loading placeholders
 * - Table row content loading
 * - Card content loading animations
 * - List item loading states
 * 
 * @module components/ui/skeleton
 * @version 1.0.0
 * @since 2025-05-23
 */

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
