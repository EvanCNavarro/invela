/**
 * Alert UI Component Suite - Comprehensive notification and messaging system
 * 
 * Provides complete alert component system with semantic structure for
 * important notifications, warnings, and status messages. Built with
 * class-variance-authority for variant management and optimized for
 * accessibility with proper ARIA roles and icon integration support.
 * 
 * Features:
 * - Complete alert composition system (Alert, Title, Description)
 * - Visual variants (default, destructive) with theme integration
 * - Advanced SVG icon positioning and styling
 * - Semantic HTML structure with proper heading hierarchy
 * - ARIA role compliance for screen reader accessibility
 * - React.forwardRef support for all components
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// External styling utilities for variant management
import { cva, type VariantProps } from "class-variance-authority";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// STYLING CONFIGURATION
// ========================================

/**
 * Alert component styling variants using class-variance-authority
 * Defines comprehensive visual styles with advanced SVG icon positioning
 */
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
);

// ========================================
// CONSTANTS
// ========================================

/**
 * Alert title styling classes for consistent typography
 * Defines heading appearance with proper spacing and tracking
 */
const ALERT_TITLE_CLASSES = "mb-1 font-medium leading-none tracking-tight";

/**
 * Alert description styling classes for content text
 * Provides readable typography with paragraph line height optimization
 */
const ALERT_DESCRIPTION_CLASSES = "text-sm [&_p]:leading-relaxed";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Alert component properties interface
 * Extends HTML div attributes with variant styling options
 */
interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

/**
 * Alert title component properties interface
 * Provides semantic heading element with proper typing
 */
interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

/**
 * Alert description component properties interface
 * Supports descriptive content in alert notifications
 */
interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Primary alert container component with accessibility features
 * 
 * Renders the main alert container with proper ARIA role and variant
 * styling. Provides foundation for notification content with advanced
 * SVG icon positioning and design system theme integration.
 * 
 * @param props Component properties including variant and HTML attributes
 * @param ref React ref for accessing the underlying div element
 * @returns JSX element containing the accessible alert container
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

/**
 * Alert title component with semantic heading structure
 * 
 * Renders a properly structured h5 heading element with consistent
 * typography scaling and spacing for alert title presentation.
 * 
 * @param props Component properties including HTML heading attributes
 * @param ref React ref for accessing the underlying heading element
 * @returns JSX element containing the semantic alert title
 */
const AlertTitle = React.forwardRef<HTMLParagraphElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn(ALERT_TITLE_CLASSES, className)}
      {...props}
    />
  )
);
AlertTitle.displayName = "AlertTitle";

/**
 * Alert description component for detailed notification content
 * 
 * Provides content area for alert descriptions with optimized paragraph
 * typography and line height for enhanced readability in notification contexts.
 * 
 * @param props Component properties including HTML div attributes
 * @param ref React ref for accessing the underlying div element
 * @returns JSX element containing the alert description content
 */
const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(ALERT_DESCRIPTION_CLASSES, className)}
      {...props}
    />
  )
);
AlertDescription.displayName = "AlertDescription";

// ========================================
// EXPORTS
// ========================================

export { Alert, AlertTitle, AlertDescription };
