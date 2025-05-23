/**
 * Calendar UI Component - Advanced date picker with comprehensive styling
 * 
 * Provides sophisticated calendar component built on react-day-picker with
 * comprehensive styling system, navigation controls, and accessibility features.
 * Optimized for date selection interfaces with design system integration and
 * responsive behavior across different viewport sizes with comprehensive
 * customization options for various calendar use cases.
 * 
 * Features:
 * - React Day Picker integration for robust date functionality
 * - Comprehensive styling system with customizable class names
 * - Responsive layout with mobile-first design approach
 * - Advanced date range selection with visual indicators
 * - Navigation controls with custom chevron icons
 * - Accessibility compliance with proper ARIA attributes
 * - Today indicator and outside days display options
 * - Design system integration with button variant consistency
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality for component creation
import * as React from "react";

// Lucide React icons for navigation controls
import { ChevronLeft, ChevronRight } from "lucide-react";

// React Day Picker for advanced calendar functionality
import { DayPicker } from "react-day-picker";

// Internal utility for conditional class names
import { cn } from "@/lib/utils";

// Button variants for consistent styling integration
import { buttonVariants } from "@/components/ui/button";

// ========================================
// CONSTANTS
// ========================================

/**
 * Calendar base styling classes for container appearance
 * Defines base padding and layout for calendar component
 */
const CALENDAR_BASE_CLASSES = "p-3";

/**
 * Default outside days display setting
 * Controls visibility of days from adjacent months
 */
const DEFAULT_SHOW_OUTSIDE_DAYS = true;

/**
 * Navigation icon styling classes for chevron controls
 * Defines consistent icon dimensions for navigation buttons
 */
const NAV_ICON_CLASSES = "h-4 w-4";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Calendar component properties interface
 * Extends React Day Picker component props with full customization support
 */
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Advanced calendar component with comprehensive date selection functionality
 * 
 * Renders sophisticated calendar interface with comprehensive styling system,
 * responsive design, and accessibility features. Built on react-day-picker for
 * robust date functionality while providing design system integration with
 * customizable appearance and responsive behavior across viewport sizes.
 * 
 * @param props Component properties including DayPicker configuration options
 * @returns JSX element containing the advanced calendar interface
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = DEFAULT_SHOW_OUTSIDE_DAYS,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(CALENDAR_BASE_CLASSES, className)}
      classNames={{
        // Monthly layout configuration with responsive design
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        
        // Caption and navigation styling
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        
        // Table and row structure styling
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        
        // Cell and day styling with comprehensive state management
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        
        // Date range and selection state styling
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        
        // Merge custom class names for extensibility
        ...classNames,
      }}
      components={{
        // Custom navigation icons with consistent styling
        IconLeft: ({ ...props }) => <ChevronLeft className={NAV_ICON_CLASSES} />,
        IconRight: ({ ...props }) => <ChevronRight className={NAV_ICON_CLASSES} />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

// ========================================
// EXPORTS
// ========================================

export { Calendar };
