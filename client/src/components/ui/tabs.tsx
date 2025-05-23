/**
 * Tabs UI Component Suite - Advanced navigation and content organization system
 * 
 * Provides comprehensive tabs component system built on Radix UI primitives with
 * advanced features including locked states, icon support, and custom styling.
 * Optimized for content organization and navigation with design system integration
 * and enhanced accessibility features including keyboard navigation and state management.
 * 
 * Features:
 * - Complete tabs composition system (Root, List, Trigger, Content)
 * - Radix UI Tabs primitives for accessibility compliance
 * - Advanced locked state functionality with visual feedback
 * - Icon integration support with Lucide React icons
 * - Custom border and hover state styling
 * - Focus ring management with proper offset handling
 * - Responsive design with minimum width constraints
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible tabs functionality
import * as TabsPrimitive from "@radix-ui/react-tabs";

// Lucide React icon for locked state indication
import { Lock } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Tabs list styling classes for navigation container
 * Defines horizontal layout with border styling and spacing
 */
const TABS_LIST_CLASSES = "inline-flex h-10 items-center justify-start border-b-[3px] border-gray-200 w-full";

/**
 * Base tabs trigger styling classes for interactive tab buttons
 * Defines foundation styling including layout, spacing, and transitions
 */
const TABS_TRIGGER_BASE_CLASSES = "inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-1.5 text-sm font-medium ring-offset-background transition-all border-b-[3px] border-transparent relative min-w-[120px] -mb-[3px]";

/**
 * Focus state styling classes for accessibility compliance
 * Defines focus ring appearance with proper offset management
 */
const TABS_TRIGGER_FOCUS_CLASSES = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Disabled state styling classes for non-interactive states
 * Defines disabled appearance with pointer event prevention
 */
const TABS_TRIGGER_DISABLED_CLASSES = "disabled:pointer-events-none disabled:opacity-50";

/**
 * Locked state styling classes for restricted tabs
 * Defines locked appearance with muted colors and cursor indication
 */
const TABS_TRIGGER_LOCKED_CLASSES = "bg-muted text-muted-foreground cursor-not-allowed";

/**
 * Default state styling classes for interactive tabs
 * Defines normal and hover state appearance with color transitions
 */
const TABS_TRIGGER_DEFAULT_CLASSES = "text-gray-600 hover:text-gray-900 hover:border-gray-300";

/**
 * Active state styling classes for selected tabs
 * Defines active appearance with background color and border styling
 */
const TABS_TRIGGER_ACTIVE_CLASSES = "data-[state=active]:bg-[#EEF4FF] data-[state=active]:text-gray-900 data-[state=active]:border-blue-500 data-[state=active]:font-semibold mr-8";

/**
 * Tabs content styling classes for panel content
 * Defines content area styling with focus management and spacing
 */
const TABS_CONTENT_CLASSES = "mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Lock icon sizing classes for locked state indication
 * Defines icon dimensions for locked tab visual feedback
 */
const LOCK_ICON_CLASSES = "h-3.5 w-3.5";

/**
 * Standard icon sizing classes for tab icons
 * Defines icon dimensions for normal tab visual elements
 */
const STANDARD_ICON_CLASSES = "h-4 w-4";

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Tabs root component for state management
 * Manages tab selection state and coordination between components
 */
const Tabs = TabsPrimitive.Root;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Enhanced tabs trigger properties interface
 * Extends Radix UI Trigger primitive with custom locked state and icon support
 */
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Indicates if the tab is locked and should be disabled with special styling */
  locked?: boolean;
  /** Optional icon component to display alongside tab text */
  icon?: React.ElementType;
}

/**
 * Tabs list component properties interface
 * Extends Radix UI List primitive with styling options
 */
interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {}

/**
 * Tabs content component properties interface
 * Extends Radix UI Content primitive with styling options
 */
interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible tabs list component for navigation organization
 * 
 * Renders horizontal tab navigation with consistent border styling and
 * spacing. Provides foundation for tab triggers with proper layout
 * management and accessibility features.
 * 
 * @param props Component properties including Radix UI List attributes
 * @param ref React ref for accessing the underlying list element
 * @returns JSX element containing the accessible tabs navigation list
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(TABS_LIST_CLASSES, className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * Enhanced tabs trigger component with locked state and icon support
 * 
 * Renders interactive tab button with advanced features including locked
 * state management, icon integration, and comprehensive styling states.
 * Built on Radix UI primitives for optimal accessibility while providing
 * enhanced visual feedback and interaction patterns.
 * 
 * @param props Component properties including custom locked state and icon options
 * @param ref React ref for accessing the underlying trigger element
 * @returns JSX element containing the enhanced tab trigger with advanced features
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, locked, icon: Icon, children, disabled, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      disabled={locked || disabled}
      className={cn(
        TABS_TRIGGER_BASE_CLASSES,
        TABS_TRIGGER_FOCUS_CLASSES,
        TABS_TRIGGER_DISABLED_CLASSES,
        locked ? TABS_TRIGGER_LOCKED_CLASSES : TABS_TRIGGER_DEFAULT_CLASSES,
        TABS_TRIGGER_ACTIVE_CLASSES,
        className
      )}
      {...props}
    >
      {locked ? <Lock className={LOCK_ICON_CLASSES} /> : Icon && <Icon className={STANDARD_ICON_CLASSES} />}
      {children}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/**
 * Accessible tabs content component for panel display
 * 
 * Renders tab panel content with proper focus management and accessibility
 * features. Provides content area for tab-associated information with
 * consistent spacing and interaction patterns.
 * 
 * @param props Component properties including Radix UI Content attributes
 * @param ref React ref for accessing the underlying content element
 * @returns JSX element containing the accessible tab content panel
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(TABS_CONTENT_CLASSES, className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ========================================
// EXPORTS
// ========================================

export { Tabs, TabsList, TabsTrigger, TabsContent };