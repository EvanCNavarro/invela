/**
 * Breadcrumb UI Component Suite - Advanced navigation path system
 * 
 * Provides complete breadcrumb navigation component system with sophisticated
 * features including hierarchical path display, separator customization, link
 * handling, and responsive design. Optimized for navigation interfaces with
 * design system integration and comprehensive accessibility features including
 * ARIA navigation landmarks, screen reader support, and semantic structure.
 * 
 * Features:
 * - Complete breadcrumb composition system (Nav, List, Item, Link, Page, etc.)
 * - Semantic HTML navigation structure with proper ARIA labels
 * - Flexible link handling with Radix UI Slot integration
 * - Customizable separators with default chevron icons
 * - Ellipsis support for truncated long navigation paths
 * - Current page indication with proper accessibility attributes
 * - Responsive design with flexible wrapping and spacing
 * - Screen reader optimized with proper roles and labels
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI slot for flexible component composition
import { Slot } from "@radix-ui/react-slot";

// Lucide React icons for navigation indicators
import { ChevronRight, MoreHorizontal } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Breadcrumb navigation aria label for accessibility
 * Provides semantic navigation landmark identification
 */
const BREADCRUMB_ARIA_LABEL = "breadcrumb";

/**
 * Breadcrumb list styling classes for navigation container
 * Defines responsive list layout with proper spacing and typography
 */
const BREADCRUMB_LIST_CLASSES = "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5";

/**
 * Breadcrumb item styling classes for individual navigation elements
 * Defines inline flex layout with consistent spacing between elements
 */
const BREADCRUMB_ITEM_CLASSES = "inline-flex items-center gap-1.5";

/**
 * Breadcrumb link styling classes for interactive navigation elements
 * Defines hover transitions and color changes for navigation links
 */
const BREADCRUMB_LINK_CLASSES = "transition-colors hover:text-foreground";

/**
 * Breadcrumb page styling classes for current page indication
 * Defines typography for active/current page in navigation path
 */
const BREADCRUMB_PAGE_CLASSES = "font-normal text-foreground";

/**
 * Breadcrumb separator styling classes for path dividers
 * Defines icon sizing for separator elements between navigation items
 */
const BREADCRUMB_SEPARATOR_CLASSES = "[&>svg]:size-3.5";

/**
 * Breadcrumb ellipsis styling classes for truncation indicators
 * Defines centered container for ellipsis display in long navigation paths
 */
const BREADCRUMB_ELLIPSIS_CLASSES = "flex h-9 w-9 items-center justify-center";

/**
 * Ellipsis icon styling classes for truncation display
 * Defines consistent icon dimensions for more indicator
 */
const ELLIPSIS_ICON_CLASSES = "h-4 w-4";

/**
 * Screen reader text for ellipsis accessibility
 * Provides descriptive text for assistive technologies
 */
const ELLIPSIS_SCREEN_READER_TEXT = "More";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Enhanced breadcrumb properties interface with separator customization
 * Extends HTML nav attributes with separator configuration options
 */
interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  /** Custom separator element to display between breadcrumb items */
  separator?: React.ReactNode;
}

/**
 * Breadcrumb list component properties interface
 * Extends HTML ordered list attributes for list customization
 */
interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<"ol"> {}

/**
 * Breadcrumb item component properties interface
 * Extends HTML list item attributes for item customization
 */
interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {}

/**
 * Enhanced breadcrumb link properties interface with slot composition
 * Extends HTML anchor attributes with Radix UI Slot integration
 */
interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  /** Enables slot-based composition for flexible link rendering */
  asChild?: boolean;
}

/**
 * Breadcrumb page component properties interface
 * Extends HTML span attributes for current page indication
 */
interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<"span"> {}

/**
 * Breadcrumb separator component properties interface
 * Extends HTML span attributes for separator customization
 */
interface BreadcrumbSeparatorProps extends React.ComponentProps<"span"> {}

/**
 * Breadcrumb ellipsis component properties interface
 * Extends HTML span attributes for ellipsis customization
 */
interface BreadcrumbEllipsisProps extends React.ComponentProps<"span"> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Semantic breadcrumb navigation component with accessibility compliance
 * 
 * Renders navigation landmark with proper ARIA labeling for breadcrumb
 * navigation paths. Built with semantic HTML nav element for optimal
 * accessibility and screen reader support with customizable separator
 * options for flexible navigation path presentation.
 * 
 * @param props Component properties including separator customization
 * @param ref React ref for accessing the underlying navigation element
 * @returns JSX element containing the semantic breadcrumb navigation
 */
const Breadcrumb = React.forwardRef<
  HTMLElement,
  BreadcrumbProps
>(({ ...props }, ref) => <nav ref={ref} aria-label={BREADCRUMB_ARIA_LABEL} {...props} />);
Breadcrumb.displayName = "Breadcrumb";

/**
 * Responsive breadcrumb list component with flexible layout
 * 
 * Renders ordered list container for breadcrumb items with responsive
 * wrapping and consistent spacing. Provides semantic structure for
 * navigation hierarchy with proper typography and spacing management
 * for optimal readability across different viewport sizes.
 * 
 * @param props Component properties including HTML ordered list attributes
 * @param ref React ref for accessing the underlying list element
 * @returns JSX element containing the responsive breadcrumb list container
 */
const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  BreadcrumbListProps
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(BREADCRUMB_LIST_CLASSES, className)}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

/**
 * Breadcrumb item component for individual navigation elements
 * 
 * Renders list item container for individual breadcrumb elements with
 * inline flex layout and consistent spacing. Provides semantic structure
 * for navigation items with proper alignment and gap management for
 * optimal visual hierarchy in navigation paths.
 * 
 * @param props Component properties including HTML list item attributes
 * @param ref React ref for accessing the underlying item element
 * @returns JSX element containing the individual breadcrumb item container
 */
const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  BreadcrumbItemProps
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn(BREADCRUMB_ITEM_CLASSES, className)}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

/**
 * Interactive breadcrumb link component with slot composition support
 * 
 * Renders navigation link with hover transitions and flexible composition
 * via Radix UI Slot integration. Supports both standard anchor elements
 * and custom component composition for integration with routing libraries
 * while maintaining consistent styling and interaction patterns.
 * 
 * @param props Component properties including slot composition and anchor attributes
 * @param ref React ref for accessing the underlying link element
 * @returns JSX element containing the interactive breadcrumb navigation link
 */
const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      className={cn(BREADCRUMB_LINK_CLASSES, className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

/**
 * Accessible breadcrumb page component for current page indication
 * 
 * Renders current page indicator with proper accessibility attributes
 * including ARIA current page marking and disabled link role. Provides
 * semantic indication of current location in navigation hierarchy with
 * screen reader support and visual styling differentiation.
 * 
 * @param props Component properties including HTML span attributes
 * @param ref React ref for accessing the underlying page element
 * @returns JSX element containing the accessible current page indicator
 */
const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  BreadcrumbPageProps
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn(BREADCRUMB_PAGE_CLASSES, className)}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

/**
 * Customizable breadcrumb separator component with default chevron icon
 * 
 * Renders path separator between breadcrumb items with customizable content
 * and default chevron icon. Includes proper accessibility attributes with
 * presentation role and hidden aria state for screen reader optimization
 * while providing visual separation between navigation elements.
 * 
 * @param props Component properties including separator content and span attributes
 * @returns JSX element containing the customizable breadcrumb path separator
 */
const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn(BREADCRUMB_SEPARATOR_CLASSES, className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </span>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

/**
 * Accessible breadcrumb ellipsis component for path truncation indication
 * 
 * Renders ellipsis indicator for truncated navigation paths with proper
 * accessibility attributes and screen reader text. Provides visual
 * indication of hidden navigation items with consistent styling and
 * centered layout for optimal user experience in long navigation paths.
 * 
 * @param props Component properties including HTML span attributes
 * @returns JSX element containing the accessible breadcrumb ellipsis indicator
 */
const BreadcrumbEllipsis = ({
  className,
  ...props
}: BreadcrumbEllipsisProps) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn(BREADCRUMB_ELLIPSIS_CLASSES, className)}
    {...props}
  >
    <MoreHorizontal className={ELLIPSIS_ICON_CLASSES} />
    <span className="sr-only">{ELLIPSIS_SCREEN_READER_TEXT}</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

// ========================================
// EXPORTS
// ========================================

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};