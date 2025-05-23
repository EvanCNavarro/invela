/**
 * Card UI Component Suite - Comprehensive layout foundation system
 * 
 * Provides complete card component system with semantic structure for
 * content organization and presentation. Built with React.forwardRef
 * patterns and design system integration for consistent layouts across
 * the application with flexible composition and styling capabilities.
 * 
 * Features:
 * - Complete card composition system (Card, Header, Title, Description, Content, Footer)
 * - Semantic HTML structure with proper heading hierarchy
 * - Design system color and spacing integration
 * - React.forwardRef support for all components
 * - Flexible layout options with consistent spacing
 * - Shadow and border styling for visual hierarchy
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
 * Base card styling classes for consistent appearance
 * Defines foundation styling with shadow, border, and theme integration
 */
const CARD_BASE_CLASSES = "rounded-lg border bg-card text-card-foreground shadow-sm";

/**
 * Card header styling classes for content organization
 * Provides structured layout with consistent spacing
 */
const CARD_HEADER_CLASSES = "flex flex-col space-y-1.5 p-6";

/**
 * Card title styling classes for typography hierarchy
 * Ensures consistent heading appearance and spacing
 */
const CARD_TITLE_CLASSES = "text-2xl font-semibold leading-none tracking-tight";

/**
 * Card description styling classes for supporting text
 * Provides muted appearance for secondary information
 */
const CARD_DESCRIPTION_CLASSES = "text-sm text-muted-foreground";

/**
 * Card content styling classes for main content area
 * Maintains consistent padding with header spacing consideration
 */
const CARD_CONTENT_CLASSES = "p-6 pt-0";

/**
 * Card footer styling classes for action area
 * Provides horizontal layout for buttons and controls
 */
const CARD_FOOTER_CLASSES = "flex items-center p-6 pt-0";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Card component properties interface
 * Extends standard HTML div attributes for maximum flexibility
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Card header component properties interface
 * Supports structured content organization in card layouts
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Card title component properties interface
 * Provides semantic heading element with proper typing
 */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

/**
 * Card description component properties interface
 * Supports descriptive text content in card layouts
 */
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

/**
 * Card content component properties interface
 * Main content area with flexible content support
 */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Card footer component properties interface
 * Action area for buttons and interactive elements
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Primary card container component with foundation styling
 * 
 * Renders the main card container with consistent border, shadow, and
 * background styling. Provides the structural foundation for content
 * organization with design system theme integration.
 * 
 * @param props Component properties including HTML div attributes
 * @param ref React ref for accessing the underlying div element
 * @returns JSX element containing the styled card container
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(CARD_BASE_CLASSES, className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

/**
 * Card header component for title and description organization
 * 
 * Provides structured layout for card titles, descriptions, and metadata
 * with consistent spacing and flex layout for content organization.
 * 
 * @param props Component properties including HTML div attributes
 * @param ref React ref for accessing the underlying div element
 * @returns JSX element containing the structured card header
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(CARD_HEADER_CLASSES, className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

/**
 * Card title component with semantic heading structure
 * 
 * Renders a properly structured h3 heading element with consistent
 * typography scaling and spacing for card title presentation.
 * 
 * @param props Component properties including HTML heading attributes
 * @param ref React ref for accessing the underlying heading element
 * @returns JSX element containing the semantic card title
 */
const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(CARD_TITLE_CLASSES, className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

/**
 * Card description component for supporting information
 * 
 * Provides semantically correct paragraph element with muted styling
 * for descriptive text and supporting information in card layouts.
 * 
 * @param props Component properties including HTML paragraph attributes
 * @param ref React ref for accessing the underlying paragraph element
 * @returns JSX element containing the styled card description
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(CARD_DESCRIPTION_CLASSES, className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

/**
 * Card content component for main information area
 * 
 * Provides the primary content area with consistent padding and spacing
 * that coordinates with header and footer components for seamless layout.
 * 
 * @param props Component properties including HTML div attributes
 * @param ref React ref for accessing the underlying div element
 * @returns JSX element containing the main card content area
 */
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(CARD_CONTENT_CLASSES, className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

/**
 * Card footer component for actions and controls
 * 
 * Provides horizontal layout area for buttons, links, and interactive
 * elements with consistent spacing and alignment patterns.
 * 
 * @param props Component properties including HTML div attributes
 * @param ref React ref for accessing the underlying div element
 * @returns JSX element containing the card action footer
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(CARD_FOOTER_CLASSES, className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// ========================================
// EXPORTS
// ========================================

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
