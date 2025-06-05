import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Enhanced Skeleton Component with Advanced Animation Options
 * 
 * This component extends the base Skeleton with advanced animation patterns
 * similar to those used in the welcome modal.
 */
export interface EnhancedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The animation style to apply
   * - shimmer: Gradient moving left to right (default)
   * - pulse: Fading in and out
   * - wave: Wave-like animation
   */
  animation?: "shimmer" | "pulse" | "wave"
}

const EnhancedSkeleton = React.forwardRef<HTMLDivElement, EnhancedSkeletonProps>(
  ({ className, animation = "shimmer", ...props }, ref) => {
    // Determine animation class based on the animation prop
    const animationClass = React.useMemo(() => {
      switch (animation) {
        case "pulse":
          return "animate-skeleton-pulse"
        case "wave":
          return "animate-wave"
        case "shimmer":
        default:
          return "skeleton-shimmer"
      }
    }, [animation])

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md bg-muted", 
          animationClass,
          className
        )}
        {...props}
      />
    )
  }
)

EnhancedSkeleton.displayName = "EnhancedSkeleton"

export { EnhancedSkeleton }