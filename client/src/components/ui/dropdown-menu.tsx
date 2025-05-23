/**
 * Dropdown Menu UI Component Suite - Advanced contextual menu system with comprehensive features
 * 
 * Provides complete dropdown menu component system built on Radix UI primitives with
 * sophisticated features including sub-menus, checkbox items, radio items, shortcuts,
 * and extensive customization options. Optimized for contextual navigation and action
 * menus with design system integration and comprehensive accessibility features including
 * keyboard navigation, focus management, and screen reader support.
 * 
 * Features:
 * - Complete dropdown menu composition system (Root, Trigger, Content, Item, etc.)
 * - Radix UI DropdownMenu primitives for accessibility compliance
 * - Advanced sub-menu system with nested navigation
 * - Checkbox and radio item variants for selection interfaces
 * - Portal rendering for proper z-index layering
 * - Rich animation system with fade, zoom, and slide transitions
 * - Keyboard shortcut display functionality
 * - Inset option for hierarchical menu organization
 * - Label and separator components for menu structure
 * - Comprehensive focus and disabled state management
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible dropdown menu functionality
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

// Lucide React icons for menu indicators and navigation
import { Check, ChevronRight, Circle } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Dropdown menu trigger styling classes for activation button
 * Defines minimal trigger styling with focus state management
 */
const DROPDOWN_TRIGGER_CLASSES = "outline-none focus:outline-none";

/**
 * Dropdown menu content styling classes for floating panel appearance
 * Defines comprehensive popup styling with animations and positioning
 */
const DROPDOWN_CONTENT_CLASSES = "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

/**
 * Dropdown menu item styling classes for selectable options
 * Defines comprehensive item appearance with states and icon management
 */
const DROPDOWN_ITEM_CLASSES = "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=open]:bg-transparent";

/**
 * Dropdown menu sub-trigger styling classes for nested menu activation
 * Defines sub-menu trigger appearance with chevron indicator positioning
 */
const DROPDOWN_SUB_TRIGGER_CLASSES = "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent";

/**
 * Dropdown menu sub-content styling classes for nested menu panels
 * Defines sub-menu panel styling with enhanced shadow for depth perception
 */
const DROPDOWN_SUB_CONTENT_CLASSES = "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

/**
 * Dropdown menu checkbox item styling classes for selectable options
 * Defines checkbox item appearance with indicator positioning
 */
const DROPDOWN_CHECKBOX_ITEM_CLASSES = "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/**
 * Dropdown menu radio item styling classes for single-select options
 * Defines radio item appearance with indicator positioning
 */
const DROPDOWN_RADIO_ITEM_CLASSES = "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/**
 * Dropdown menu label styling classes for section headers
 * Defines label appearance with proper typography and spacing
 */
const DROPDOWN_LABEL_CLASSES = "px-2 py-1.5 text-sm font-semibold";

/**
 * Dropdown menu separator styling classes for visual division
 * Defines horizontal line appearance for grouping menu content
 */
const DROPDOWN_SEPARATOR_CLASSES = "-mx-1 my-1 h-px bg-muted";

/**
 * Dropdown menu shortcut styling classes for keyboard hint display
 * Defines shortcut text appearance with subtle styling
 */
const DROPDOWN_SHORTCUT_CLASSES = "ml-auto text-xs tracking-widest opacity-60";

/**
 * Item indicator container styling classes for selection indication
 * Defines absolute positioning for check and radio indicators
 */
const ITEM_INDICATOR_CONTAINER_CLASSES = "absolute left-2 flex h-3.5 w-3.5 items-center justify-center";

/**
 * Inset padding classes for hierarchical menu item organization
 * Defines additional left padding for nested menu items
 */
const INSET_PADDING_CLASSES = "pl-8";

/**
 * Chevron icon styling classes for sub-menu indication
 * Defines chevron appearance and positioning for sub-menu triggers
 */
const CHEVRON_ICON_CLASSES = "ml-auto h-4 w-4";

/**
 * Check icon styling classes for checkbox item indication
 * Defines check icon dimensions for selected state feedback
 */
const CHECK_ICON_CLASSES = "h-4 w-4";

/**
 * Circle icon styling classes for radio item indication
 * Defines circle icon dimensions and fill for selected state feedback
 */
const CIRCLE_ICON_CLASSES = "h-2 w-2 fill-current";

/**
 * Default side offset for dropdown menu positioning
 * Provides consistent spacing between trigger and menu content
 */
const DEFAULT_SIDE_OFFSET = 4;

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Dropdown menu root component for state management
 * Manages dropdown menu open/close state and interactions
 */
const DropdownMenu = DropdownMenuPrimitive.Root;

/**
 * Dropdown menu group component for item organization
 * Provides grouping functionality for related menu items
 */
const DropdownMenuGroup = DropdownMenuPrimitive.Group;

/**
 * Dropdown menu portal component for rendering control
 * Manages portal rendering for proper DOM placement
 */
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

/**
 * Dropdown menu sub-menu root component for nested menu state
 * Manages sub-menu open/close state and interactions
 */
const DropdownMenuSub = DropdownMenuPrimitive.Sub;

/**
 * Dropdown menu radio group component for single-select functionality
 * Provides radio group context for mutually exclusive menu items
 */
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Dropdown menu trigger component properties interface
 * Extends Radix UI Trigger primitive with styling options
 */
interface DropdownMenuTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {}

/**
 * Dropdown menu content component properties interface
 * Extends Radix UI Content primitive with positioning and styling options
 */
interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {}

/**
 * Enhanced dropdown menu item properties interface
 * Extends Radix UI Item primitive with inset option for hierarchical organization
 */
interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  /** Indicates if the item should have additional left padding for hierarchy */
  inset?: boolean;
}

/**
 * Enhanced dropdown menu sub-trigger properties interface
 * Extends Radix UI SubTrigger primitive with inset option for hierarchical organization
 */
interface DropdownMenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
  /** Indicates if the sub-trigger should have additional left padding for hierarchy */
  inset?: boolean;
}

/**
 * Dropdown menu sub-content component properties interface
 * Extends Radix UI SubContent primitive with styling options
 */
interface DropdownMenuSubContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> {}

/**
 * Dropdown menu checkbox item component properties interface
 * Extends Radix UI CheckboxItem primitive with styling options
 */
interface DropdownMenuCheckboxItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {}

/**
 * Dropdown menu radio item component properties interface
 * Extends Radix UI RadioItem primitive with styling options
 */
interface DropdownMenuRadioItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> {}

/**
 * Enhanced dropdown menu label properties interface
 * Extends Radix UI Label primitive with inset option for hierarchical organization
 */
interface DropdownMenuLabelProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
  /** Indicates if the label should have additional left padding for hierarchy */
  inset?: boolean;
}

/**
 * Dropdown menu separator component properties interface
 * Extends Radix UI Separator primitive with styling options
 */
interface DropdownMenuSeparatorProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {}

/**
 * Dropdown menu shortcut component properties interface
 * Extends HTML span attributes for keyboard shortcut display
 */
interface DropdownMenuShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accessible dropdown menu trigger component with minimal styling
 * 
 * Renders activation trigger for dropdown menu with minimal focus styling.
 * Built on Radix UI primitives for optimal accessibility while providing
 * clean trigger interface without intrusive styling.
 * 
 * @param props Component properties including Radix UI Trigger attributes
 * @param ref React ref for accessing the underlying trigger element
 * @returns JSX element containing the accessible dropdown menu trigger
 */
const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  DropdownMenuTriggerProps
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger
    ref={ref}
    className={cn(DROPDOWN_TRIGGER_CLASSES, className)}
    {...props}
  >
    {children}
  </DropdownMenuPrimitive.Trigger>
));
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

/**
 * Advanced dropdown menu content component with portal rendering and animations
 * 
 * Renders floating menu content with sophisticated positioning, animations,
 * and portal rendering for proper z-index management. Built on Radix UI
 * primitives for optimal accessibility while providing consistent design
 * system styling and responsive behavior.
 * 
 * @param props Component properties including positioning and styling options
 * @param ref React ref for accessing the underlying menu content element
 * @returns JSX element containing the advanced floating dropdown menu content
 */
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = DEFAULT_SIDE_OFFSET, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(DROPDOWN_CONTENT_CLASSES, className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

/**
 * Interactive dropdown menu item component with hierarchical support
 * 
 * Renders selectable menu item with comprehensive state management and
 * optional inset styling for hierarchical organization. Built on Radix UI
 * primitives for optimal accessibility while providing consistent visual
 * feedback and interaction patterns with icon management.
 * 
 * @param props Component properties including hierarchical inset option
 * @param ref React ref for accessing the underlying menu item element
 * @returns JSX element containing the interactive dropdown menu item
 */
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      DROPDOWN_ITEM_CLASSES,
      inset && INSET_PADDING_CLASSES,
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

/**
 * Interactive dropdown sub-menu trigger component with chevron indicator
 * 
 * Renders sub-menu activation trigger with chevron indicator and hierarchical
 * support. Built on Radix UI primitives for optimal accessibility while
 * providing clear visual indication of sub-menu functionality with proper
 * focus management and state transitions.
 * 
 * @param props Component properties including hierarchical inset option
 * @param ref React ref for accessing the underlying sub-trigger element
 * @returns JSX element containing the interactive sub-menu trigger with chevron
 */
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  DropdownMenuSubTriggerProps
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      DROPDOWN_SUB_TRIGGER_CLASSES,
      inset && INSET_PADDING_CLASSES,
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className={CHEVRON_ICON_CLASSES} />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

/**
 * Advanced dropdown sub-menu content component with enhanced depth styling
 * 
 * Renders nested sub-menu content with enhanced shadow for depth perception
 * and comprehensive animations. Built on Radix UI primitives for optimal
 * accessibility while providing visual hierarchy through enhanced styling
 * and smooth transition effects.
 * 
 * @param props Component properties including Radix UI SubContent attributes
 * @param ref React ref for accessing the underlying sub-content element
 * @returns JSX element containing the advanced sub-menu content panel
 */
const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  DropdownMenuSubContentProps
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(DROPDOWN_SUB_CONTENT_CLASSES, className)}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

/**
 * Interactive dropdown checkbox item component with selection indication
 * 
 * Renders selectable checkbox menu item with check icon indication and
 * comprehensive state management. Built on Radix UI primitives for optimal
 * accessibility while providing clear visual feedback for multi-selection
 * interfaces with proper indicator positioning.
 * 
 * @param props Component properties including Radix UI CheckboxItem attributes
 * @param ref React ref for accessing the underlying checkbox item element
 * @returns JSX element containing the interactive checkbox menu item
 */
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  DropdownMenuCheckboxItemProps
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(DROPDOWN_CHECKBOX_ITEM_CLASSES, className)}
    checked={checked}
    {...props}
  >
    <span className={ITEM_INDICATOR_CONTAINER_CLASSES}>
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className={CHECK_ICON_CLASSES} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

/**
 * Interactive dropdown radio item component with circle selection indication
 * 
 * Renders selectable radio menu item with circle icon indication and
 * comprehensive state management. Built on Radix UI primitives for optimal
 * accessibility while providing clear visual feedback for single-selection
 * interfaces with proper indicator positioning.
 * 
 * @param props Component properties including Radix UI RadioItem attributes
 * @param ref React ref for accessing the underlying radio item element
 * @returns JSX element containing the interactive radio menu item
 */
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  DropdownMenuRadioItemProps
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(DROPDOWN_RADIO_ITEM_CLASSES, className)}
    {...props}
  >
    <span className={ITEM_INDICATOR_CONTAINER_CLASSES}>
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className={CIRCLE_ICON_CLASSES} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

/**
 * Dropdown menu label component with hierarchical support
 * 
 * Renders section label for grouping related menu items with proper
 * typography and optional inset styling for hierarchical organization.
 * Provides semantic structure for better accessibility and visual organization.
 * 
 * @param props Component properties including hierarchical inset option
 * @param ref React ref for accessing the underlying label element
 * @returns JSX element containing the accessible menu section label
 */
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  DropdownMenuLabelProps
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      DROPDOWN_LABEL_CLASSES,
      inset && INSET_PADDING_CLASSES,
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

/**
 * Dropdown menu separator component for visual content division
 * 
 * Renders horizontal separator line for visually grouping menu content
 * with consistent styling and proper spacing. Provides semantic structure
 * for better content organization and accessibility.
 * 
 * @param props Component properties including Radix UI Separator attributes
 * @param ref React ref for accessing the underlying separator element
 * @returns JSX element containing the visual content separator
 */
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(DROPDOWN_SEPARATOR_CLASSES, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

/**
 * Dropdown menu shortcut component for keyboard hint display
 * 
 * Renders keyboard shortcut text with subtle styling for accessibility
 * and user guidance. Provides consistent formatting for keyboard navigation
 * hints and action shortcuts within menu items.
 * 
 * @param props Component properties including HTML span attributes
 * @returns JSX element containing the formatted keyboard shortcut text
 */
const DropdownMenuShortcut = ({ className, ...props }: DropdownMenuShortcutProps) => {
  return (
    <span
      className={cn(DROPDOWN_SHORTCUT_CLASSES, className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

// ========================================
// EXPORTS
// ========================================

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};