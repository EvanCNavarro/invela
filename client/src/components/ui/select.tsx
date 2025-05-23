/**
 * Select UI Component Suite - Advanced dropdown selection system with comprehensive features
 * 
 * Provides complete select dropdown component system built on Radix UI primitives with
 * sophisticated features including portal rendering, scroll controls, animations, and
 * extensive customization options. Optimized for form controls and data selection with
 * design system integration and comprehensive accessibility features including keyboard
 * navigation, screen reader support, and focus management.
 * 
 * Features:
 * - Complete select composition system (Root, Group, Value, Trigger, Content, Item, etc.)
 * - Radix UI Select primitives for accessibility compliance
 * - Advanced portal rendering for proper z-index layering
 * - Sophisticated scroll controls with up/down navigation
 * - Rich animation system with fade, zoom, and slide transitions
 * - Intelligent positioning with popper integration
 * - Check icon indication for selected items
 * - Label and separator components for organization
 * - Comprehensive focus and disabled state management
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible select functionality
import * as SelectPrimitive from "@radix-ui/react-select";

// Lucide React icons for selection indicators and navigation
import { Check, ChevronDown, ChevronUp } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Select trigger styling classes for dropdown button appearance
 * Defines comprehensive input-like styling with focus states and accessibility
 */
const SELECT_TRIGGER_CLASSES = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1";

/**
 * Scroll button styling classes for navigation controls
 * Defines button appearance for up/down scroll controls in dropdown
 */
const SCROLL_BUTTON_CLASSES = "flex cursor-default items-center justify-center py-1";

/**
 * Select content base styling classes for dropdown panel appearance
 * Defines comprehensive popup styling with animations and positioning
 */
const SELECT_CONTENT_BASE_CLASSES = "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

/**
 * Popper positioning classes for advanced dropdown placement
 * Defines translation adjustments for optimal positioning
 */
const POPPER_POSITION_CLASSES = "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1";

/**
 * Select viewport base styling classes for content container
 * Defines padding and basic layout for dropdown content area
 */
const SELECT_VIEWPORT_BASE_CLASSES = "p-1";

/**
 * Popper viewport styling classes for responsive sizing
 * Defines dynamic sizing based on trigger dimensions
 */
const SELECT_VIEWPORT_POPPER_CLASSES = "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]";

/**
 * Select label styling classes for section headers
 * Defines label appearance with proper spacing and typography
 */
const SELECT_LABEL_CLASSES = "py-1.5 pl-8 pr-2 text-sm font-semibold";

/**
 * Select item styling classes for selectable options
 * Defines comprehensive item appearance with states and accessibility
 */
const SELECT_ITEM_CLASSES = "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/**
 * Item indicator container styling classes for check icon positioning
 * Defines absolute positioning for selection indicator
 */
const ITEM_INDICATOR_CONTAINER_CLASSES = "absolute left-2 flex h-3.5 w-3.5 items-center justify-center";

/**
 * Select separator styling classes for visual division
 * Defines horizontal line appearance for grouping content
 */
const SELECT_SEPARATOR_CLASSES = "-mx-1 my-1 h-px bg-muted";

/**
 * Chevron icon styling classes for dropdown indicators
 * Defines icon sizing and opacity for visual feedback
 */
const CHEVRON_ICON_CLASSES = "h-4 w-4 opacity-50";

/**
 * Standard icon styling classes for navigation and selection
 * Defines consistent icon sizing throughout select components
 */
const STANDARD_ICON_CLASSES = "h-4 w-4";

/**
 * Default select content position for optimal display
 * Defines preferred positioning strategy for dropdown placement
 */
const DEFAULT_CONTENT_POSITION = "popper";

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Select root component for state management
 * Manages selection state and coordination between all select components
 */
const Select = SelectPrimitive.Root;

/**
 * Select group component for option organization
 * Provides grouping functionality for related select options
 */
const SelectGroup = SelectPrimitive.Group;

/**
 * Select value component for displaying current selection
 * Shows the currently selected value within the trigger
 */
const SelectValue = SelectPrimitive.Value;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Select trigger component properties interface
 * Extends Radix UI Trigger primitive with styling options
 */
interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {}

/**
 * Select scroll button properties interface
 * Extends Radix UI scroll button primitives with styling options
 */
interface SelectScrollButtonProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton> {}

/**
 * Select content component properties interface
 * Extends Radix UI Content primitive with positioning and styling options
 */
interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {}

/**
 * Select label component properties interface
 * Extends Radix UI Label primitive with styling options
 */
interface SelectLabelProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label> {}

/**
 * Select item component properties interface
 * Extends Radix UI Item primitive with styling options
 */
interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {}

/**
 * Select separator component properties interface
 * Extends Radix UI Separator primitive with styling options
 */
interface SelectSeparatorProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible select trigger component with comprehensive styling
 * 
 * Renders interactive dropdown trigger with input-like appearance and
 * chevron indicator. Built on Radix UI primitives for optimal accessibility
 * while providing consistent form control styling and focus management.
 * 
 * @param props Component properties including Radix UI Trigger attributes
 * @param ref React ref for accessing the underlying trigger element
 * @returns JSX element containing the accessible select trigger with styling
 */
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(SELECT_TRIGGER_CLASSES, className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className={CHEVRON_ICON_CLASSES} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

/**
 * Select scroll up button component for navigation control
 * 
 * Renders upward scroll button for navigating through dropdown options
 * when content exceeds available space. Provides accessible navigation
 * with consistent styling and keyboard support.
 * 
 * @param props Component properties including Radix UI ScrollUpButton attributes
 * @param ref React ref for accessing the underlying button element
 * @returns JSX element containing the accessible scroll up button
 */
const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  SelectScrollButtonProps
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(SCROLL_BUTTON_CLASSES, className)}
    {...props}
  >
    <ChevronUp className={STANDARD_ICON_CLASSES} />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

/**
 * Select scroll down button component for navigation control
 * 
 * Renders downward scroll button for navigating through dropdown options
 * when content exceeds available space. Provides accessible navigation
 * with consistent styling and keyboard support.
 * 
 * @param props Component properties including Radix UI ScrollDownButton attributes
 * @param ref React ref for accessing the underlying button element
 * @returns JSX element containing the accessible scroll down button
 */
const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  SelectScrollButtonProps
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(SCROLL_BUTTON_CLASSES, className)}
    {...props}
  >
    <ChevronDown className={STANDARD_ICON_CLASSES} />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

/**
 * Advanced select content component with portal rendering and animations
 * 
 * Renders dropdown content panel with sophisticated positioning, animations,
 * and portal rendering for proper z-index management. Includes scroll controls
 * and responsive sizing with comprehensive accessibility features.
 * 
 * @param props Component properties including positioning and styling options
 * @param ref React ref for accessing the underlying content element
 * @returns JSX element containing the advanced dropdown content panel
 */
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = DEFAULT_CONTENT_POSITION, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        SELECT_CONTENT_BASE_CLASSES,
        position === "popper" && POPPER_POSITION_CLASSES,
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          SELECT_VIEWPORT_BASE_CLASSES,
          position === "popper" && SELECT_VIEWPORT_POPPER_CLASSES
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

/**
 * Select label component for section organization
 * 
 * Renders section label for grouping related select options with
 * consistent typography and spacing. Provides semantic structure
 * for better accessibility and visual organization.
 * 
 * @param props Component properties including Radix UI Label attributes
 * @param ref React ref for accessing the underlying label element
 * @returns JSX element containing the accessible section label
 */
const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  SelectLabelProps
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(SELECT_LABEL_CLASSES, className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

/**
 * Interactive select item component with selection indication
 * 
 * Renders selectable option with check icon indication and comprehensive
 * state management. Built on Radix UI primitives for optimal accessibility
 * while providing consistent visual feedback and interaction patterns.
 * 
 * @param props Component properties including Radix UI Item attributes
 * @param ref React ref for accessing the underlying item element
 * @returns JSX element containing the interactive select option
 */
const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(SELECT_ITEM_CLASSES, className)}
    {...props}
  >
    <span className={ITEM_INDICATOR_CONTAINER_CLASSES}>
      <SelectPrimitive.ItemIndicator>
        <Check className={STANDARD_ICON_CLASSES} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

/**
 * Select separator component for visual content division
 * 
 * Renders horizontal separator line for visually grouping select content
 * with consistent styling and proper spacing. Provides semantic structure
 * for better content organization and accessibility.
 * 
 * @param props Component properties including Radix UI Separator attributes
 * @param ref React ref for accessing the underlying separator element
 * @returns JSX element containing the visual content separator
 */
const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  SelectSeparatorProps
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn(SELECT_SEPARATOR_CLASSES, className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// ========================================
// EXPORTS
// ========================================

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
