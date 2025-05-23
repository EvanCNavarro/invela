/**
 * Command UI Component Suite - Advanced command palette and search system
 * 
 * Provides complete command palette component system built on CMDK with sophisticated
 * search functionality, keyboard navigation, and dialog integration. Optimized for
 * command interfaces with design system integration and accessibility compliance
 * including proper ARIA attributes, search filtering, and comprehensive keyboard
 * shortcuts for various command palette use cases including global search and actions.
 * 
 * Features:
 * - Complete command composition system (Root, Dialog, Input, List, Groups, Items)
 * - CMDK integration for robust command palette functionality
 * - Advanced search filtering with keyboard navigation support
 * - Dialog integration for modal command interfaces
 * - Accessibility compliance with proper ARIA attributes and keyboard shortcuts
 * - Design system integration with consistent styling patterns
 * - Group organization with headings and separators
 * - Shortcut display with keyboard combination support
 * - Empty state handling with user-friendly messaging
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI Dialog types for modal integration
import { type DialogProps } from "@radix-ui/react-dialog";

// CMDK for advanced command palette functionality
import { Command as CommandPrimitive } from "cmdk";

// Lucide React icons for search controls
import { Search } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// Dialog components for modal command interfaces
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ========================================
// CONSTANTS
// ========================================

/**
 * Command root styling classes for container appearance
 * Defines flex layout, overflow management, and popover styling
 */
const COMMAND_ROOT_CLASSES = "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground";

/**
 * Command dialog content styling classes for modal presentation
 * Defines overflow management, padding removal, and shadow effects
 */
const COMMAND_DIALOG_CONTENT_CLASSES = "overflow-hidden p-0 shadow-lg";

/**
 * Command dialog nested styling classes for internal command styling
 * Defines comprehensive styling for all command sub-components within dialog
 */
const COMMAND_DIALOG_NESTED_CLASSES = "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5";

/**
 * Command input wrapper styling classes for search container
 * Defines flex layout, border styling, and padding for input wrapper
 */
const COMMAND_INPUT_WRAPPER_CLASSES = "flex items-center border-b px-3";

/**
 * Search icon styling classes for input decoration
 * Defines icon size, spacing, and opacity for search indicator
 */
const SEARCH_ICON_CLASSES = "mr-2 h-4 w-4 shrink-0 opacity-50";

/**
 * Command input styling classes for search field appearance
 * Defines flex layout, height, styling, and accessibility states
 */
const COMMAND_INPUT_CLASSES = "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Command list styling classes for scrollable results container
 * Defines maximum height and overflow management for result lists
 */
const COMMAND_LIST_CLASSES = "max-h-[300px] overflow-y-auto overflow-x-hidden";

/**
 * Command empty state styling classes for no results presentation
 * Defines padding, text alignment, and size for empty state display
 */
const COMMAND_EMPTY_CLASSES = "py-6 text-center text-sm";

/**
 * Command group styling classes for organized result sections
 * Defines overflow management and spacing for grouped results
 */
const COMMAND_GROUP_CLASSES = "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";

/**
 * Command separator styling classes for visual section division
 * Defines height, background, and margin for group separators
 */
const COMMAND_SEPARATOR_CLASSES = "-mx-1 h-px bg-border";

/**
 * Command item styling classes for interactive result entries
 * Defines padding, spacing, states, and accessibility for selectable items
 */
const COMMAND_ITEM_CLASSES = "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50";

/**
 * Command shortcut styling classes for keyboard combination display
 * Defines positioning, text styling, and spacing for shortcut indicators
 */
const COMMAND_SHORTCUT_CLASSES = "ml-auto text-xs tracking-widest text-muted-foreground";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Command dialog properties interface
 * Extends Dialog component props for modal command interfaces
 */
interface CommandDialogProps extends DialogProps {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Advanced command root component with comprehensive search functionality
 * 
 * Renders sophisticated command palette container with search capabilities,
 * keyboard navigation, and accessibility compliance. Built on CMDK for robust
 * command functionality while providing design system integration with
 * customizable appearance and responsive behavior for various command use cases.
 * 
 * @param props Component properties including CMDK configuration options
 * @param ref React ref for accessing the underlying command element
 * @returns JSX element containing the advanced command interface
 */
const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(COMMAND_ROOT_CLASSES, className)}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

/**
 * Command dialog component for modal command interfaces
 * 
 * Renders command palette within dialog modal with proper styling and
 * accessibility features. Provides modal command interface with comprehensive
 * styling for all sub-components and responsive behavior for optimal user
 * experience in command palette interactions and global search functionality.
 * 
 * @param props Dialog properties including children and modal configuration
 * @returns JSX element containing the modal command interface
 */
const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className={COMMAND_DIALOG_CONTENT_CLASSES}>
        <Command className={COMMAND_DIALOG_NESTED_CLASSES}>
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Command input component with search icon and accessibility features
 * 
 * Renders search input field with integrated search icon and proper accessibility
 * attributes. Provides responsive input interface with placeholder text support,
 * keyboard navigation, and focus management for optimal command palette search
 * experience with design system integration and comprehensive user interaction.
 * 
 * @param props Component properties including input configuration options
 * @param ref React ref for accessing the underlying input element
 * @returns JSX element containing the search input with integrated icon
 */
const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className={COMMAND_INPUT_WRAPPER_CLASSES} cmdk-input-wrapper="">
    <Search className={SEARCH_ICON_CLASSES} />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(COMMAND_INPUT_CLASSES, className)}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

/**
 * Command list component for scrollable search results
 * 
 * Renders scrollable container for command search results with overflow management
 * and accessibility features. Provides responsive result list interface with proper
 * scroll behavior, keyboard navigation support, and focus management for optimal
 * command palette interaction and search result presentation.
 * 
 * @param props Component properties including list configuration options
 * @param ref React ref for accessing the underlying list element
 * @returns JSX element containing the scrollable results container
 */
const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(COMMAND_LIST_CLASSES, className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

/**
 * Command empty state component for no results presentation
 * 
 * Renders empty state message when no search results are found with proper
 * styling and accessibility features. Provides user-friendly feedback for
 * empty search results with responsive design and clear messaging for
 * optimal user experience during command palette interactions.
 * 
 * @param props Component properties including empty state configuration
 * @param ref React ref for accessing the underlying empty element
 * @returns JSX element containing the empty state presentation
 */
const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={COMMAND_EMPTY_CLASSES}
    {...props}
  />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

/**
 * Command group component for organized result sections
 * 
 * Renders grouped command results with proper heading styling and organization.
 * Provides structured result presentation with group headings, proper spacing,
 * and accessibility features for optimal command palette organization and
 * user navigation through categorized search results and command options.
 * 
 * @param props Component properties including group configuration options
 * @param ref React ref for accessing the underlying group element
 * @returns JSX element containing the organized command group
 */
const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(COMMAND_GROUP_CLASSES, className)}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

/**
 * Command separator component for visual section division
 * 
 * Renders visual separator between command groups with proper styling and
 * spacing. Provides clear section division for organized command palette
 * presentation with responsive design and consistent visual hierarchy for
 * optimal user experience during command navigation and selection.
 * 
 * @param props Component properties including separator configuration options
 * @param ref React ref for accessing the underlying separator element
 * @returns JSX element containing the visual group separator
 */
const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn(COMMAND_SEPARATOR_CLASSES, className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

/**
 * Command item component for interactive result entries
 * 
 * Renders individual command result with interactive states and accessibility
 * features. Provides selectable command interface with proper hover states,
 * keyboard navigation, focus management, and responsive design for optimal
 * user interaction during command palette selection and execution.
 * 
 * @param props Component properties including item configuration options
 * @param ref React ref for accessing the underlying item element
 * @returns JSX element containing the interactive command item
 */
const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(COMMAND_ITEM_CLASSES, className)}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

/**
 * Command shortcut component for keyboard combination display
 * 
 * Renders keyboard shortcut indicators for command items with proper styling
 * and positioning. Provides visual keyboard shortcut presentation with
 * consistent typography and spacing for optimal user guidance during
 * command palette interaction and keyboard navigation learning.
 * 
 * @param props Component properties including shortcut configuration options
 * @returns JSX element containing the keyboard shortcut display
 */
const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(COMMAND_SHORTCUT_CLASSES, className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

// ========================================
// EXPORTS
// ========================================

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
