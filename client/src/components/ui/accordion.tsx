/**
 * Accordion UI Component Suite - Collapsible content organization system
 * 
 * Provides complete accordion component system built on Radix UI primitives with
 * smooth animations and collapsible functionality. Optimized for content organization
 * and progressive disclosure with design system integration and comprehensive
 * accessibility features including keyboard navigation and screen reader support.
 * 
 * Features:
 * - Complete accordion composition system (Root, Item, Trigger, Content)
 * - Radix UI Accordion primitives for accessibility compliance
 * - Smooth expand/collapse animations with custom keyframes
 * - Chevron rotation indicator with state-aware transforms
 * - Flexible item borders for visual separation
 * - Hover effects with underline feedback
 * - Responsive layout with proper semantic structure
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Radix UI primitive for accessible accordion functionality
import * as AccordionPrimitive from "@radix-ui/react-accordion";

// Lucide React icon for expand/collapse indication
import { ChevronDown } from "lucide-react";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Accordion item styling classes for container appearance
 * Defines border styling for visual separation between items
 */
const ACCORDION_ITEM_CLASSES = "border-b";

/**
 * Accordion header wrapper styling classes for layout structure
 * Defines flex layout for proper header organization
 */
const ACCORDION_HEADER_CLASSES = "flex";

/**
 * Accordion trigger styling classes for interactive button appearance
 * Defines comprehensive button styling with states and animations
 */
const ACCORDION_TRIGGER_CLASSES = "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180";

/**
 * Accordion content base styling classes for collapsible panel
 * Defines content container with overflow and animation support
 */
const ACCORDION_CONTENT_BASE_CLASSES = "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down";

/**
 * Accordion content inner styling classes for padding and layout
 * Defines inner content spacing and layout structure
 */
const ACCORDION_CONTENT_INNER_CLASSES = "pb-4 pt-0";

/**
 * Chevron icon styling classes for expand/collapse indicator
 * Defines icon sizing and animation properties
 */
const CHEVRON_ICON_CLASSES = "h-4 w-4 shrink-0 transition-transform duration-200";

// ========================================
// COMPONENT ALIASES
// ========================================

/**
 * Accordion root component for state management
 * Manages accordion expansion state and coordination between items
 */
const Accordion = AccordionPrimitive.Root;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Accordion item component properties interface
 * Extends Radix UI Item primitive with styling options
 */
interface AccordionItemProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {}

/**
 * Accordion trigger component properties interface
 * Extends Radix UI Trigger primitive with styling options
 */
interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {}

/**
 * Accordion content component properties interface
 * Extends Radix UI Content primitive with styling options
 */
interface AccordionContentProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Accordion item component for individual collapsible sections
 * 
 * Renders individual accordion item with border styling for visual
 * separation. Provides semantic structure for collapsible content
 * sections with consistent spacing and accessibility features.
 * 
 * @param props Component properties including Radix UI Item attributes
 * @param ref React ref for accessing the underlying item element
 * @returns JSX element containing the accordion item container
 */
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  AccordionItemProps
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(ACCORDION_ITEM_CLASSES, className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

/**
 * Interactive accordion trigger component with chevron indicator
 * 
 * Renders clickable trigger button with chevron rotation animation and
 * hover effects. Built on Radix UI primitives for optimal accessibility
 * while providing comprehensive visual feedback and state management
 * with smooth animations and responsive layout.
 * 
 * @param props Component properties including Radix UI Trigger attributes
 * @param ref React ref for accessing the underlying trigger element
 * @returns JSX element containing the interactive accordion trigger button
 */
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className={ACCORDION_HEADER_CLASSES}>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(ACCORDION_TRIGGER_CLASSES, className)}
      {...props}
    >
      {children}
      <ChevronDown className={CHEVRON_ICON_CLASSES} />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

/**
 * Animated accordion content component for collapsible panels
 * 
 * Renders collapsible content panel with smooth expand/collapse animations
 * and proper overflow handling. Built on Radix UI primitives for optimal
 * accessibility while providing consistent content spacing and responsive
 * behavior with custom animation keyframes.
 * 
 * @param props Component properties including Radix UI Content attributes
 * @param ref React ref for accessing the underlying content element
 * @returns JSX element containing the animated collapsible content panel
 */
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={ACCORDION_CONTENT_BASE_CLASSES}
    {...props}
  >
    <div className={cn(ACCORDION_CONTENT_INNER_CLASSES, className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

// ========================================
// EXPORTS
// ========================================

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
