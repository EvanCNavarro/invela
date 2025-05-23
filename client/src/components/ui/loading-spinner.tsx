/**
 * Loading Spinner UI Component - Brand-consistent loading indicator
 * 
 * Provides animated loading spinner component with Invela brand identity
 * and customizable sizing options. Implements smooth rotation animation
 * with optimal performance and accessibility features for loading states
 * across the application interface.
 * 
 * Features:
 * - Brand-consistent Invela logo animation
 * - Responsive sizing system (xs, sm, md, lg)
 * - Smooth CSS animation with hardware acceleration
 * - Accessible loading indication
 * - Customizable styling through className prop
 */

// ========================================
// IMPORTS
// ========================================

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Loading spinner component properties interface
 * Defines customization options for spinner appearance and behavior
 */
interface LoadingSpinnerProps {
  /** Additional CSS classes for custom styling */
  className?: string;
  /** Predefined size variants for consistent scaling */
  size?: "xs" | "sm" | "md" | "lg";
}

// ========================================
// CONSTANTS
// ========================================

/**
 * Size variant configuration mapping
 * Defines consistent dimensions for each spinner size option
 */
const SPINNER_SIZE_CLASSES = {
  xs: "h-3 w-3",
  sm: "h-4 w-4", 
  md: "h-8 w-8",
  lg: "h-12 w-12"
} as const;

/**
 * Base container classes for spinner layout
 * Ensures consistent centering and flex behavior
 */
const SPINNER_BASE_CLASSES = "flex items-center justify-center";

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Animated loading spinner component with Invela branding
 * 
 * Renders a smooth rotating animation using the Invela logo SVG with
 * configurable sizing and styling options. Optimized for performance
 * with CSS-based animations and provides consistent loading feedback
 * across different UI contexts.
 * 
 * @param props Component properties including size and styling options
 * @returns JSX element containing the animated loading spinner
 */
export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn(
      SPINNER_BASE_CLASSES,
      SPINNER_SIZE_CLASSES[size],
      className
    )}>
      <svg 
        viewBox="0 0 28 28" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        xmlns:anim="http://www.w3.org/2000/anim" 
        anim="" 
        anim:transform-origin="50% 50%" 
        anim:duration="1" 
        anim:ease="ease-in-out"
        className="animate-spin"
        role="img"
        aria-label="Loading content"
      >
        <g id="Frame 427319720">
          <g id="Invela Icon" anim:rotation="0[0:1:360:ease-in-out]">
            <path 
              d="M4.11091 11.9259H7.96489V15.8148H4.11091V11.9259Z" 
              fill="#4965EC" 
              fillOpacity="0.5"
            />
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M23.8947 14C23.8947 19.5842 19.4084 24.1111 13.8743 24.1111C8.95555 24.1111 4.85962 20.5316 4.01429 15.8148H0.115504C0.99735 22.6895 6.82123 28 13.8743 28C21.5369 28 27.7486 21.732 27.7486 14C27.7486 6.26801 21.5369 0 13.8743 0C6.91015 0 1.14439 5.17749 0.151206 11.9259H4.06422C5.01052 7.33757 9.04646 3.88889 13.8743 3.88889C19.4084 3.88889 23.8947 8.41579 23.8947 14ZM8.50022e-05 13.9505C2.83495e-05 13.967 0 13.9835 0 14C0 14.0165 2.83495e-05 14.033 8.50022e-05 14.0495V13.9505Z" 
              fill="#4965EC" 
              fillOpacity="0.5"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}