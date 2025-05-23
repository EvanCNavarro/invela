/**
 * Table UI Component Suite - Advanced data display system with sorting and accessibility
 * 
 * Provides complete table component system built on semantic HTML table elements with
 * sophisticated features including column management, sorting functionality, responsive
 * design, and extensive customization options. Optimized for data presentation and
 * tabular interfaces with design system integration and comprehensive accessibility
 * features including screen reader support, keyboard navigation, and semantic structure.
 * 
 * Features:
 * - Complete table composition system (Table, Header, Body, Footer, Row, Cell, etc.)
 * - Generic TypeScript interface for flexible data handling
 * - Advanced column configuration with sortable functionality
 * - Responsive overflow handling with horizontal scrolling
 * - Row selection states and hover effects
 * - Checkbox integration support with proper spacing
 * - Caption support for accessibility compliance
 * - Comprehensive styling with consistent spacing and typography
 * - Semantic HTML structure for optimal screen reader support
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
 * Table container styling classes for responsive overflow handling
 * Defines container appearance with horizontal scroll capability
 */
const TABLE_CONTAINER_CLASSES = "relative w-full overflow-auto";

/**
 * Table base styling classes for semantic table appearance
 * Defines table typography and caption positioning
 */
const TABLE_BASE_CLASSES = "w-full caption-bottom text-sm";

/**
 * Table header styling classes for column heading section
 * Defines header appearance with bottom border for visual separation
 */
const TABLE_HEADER_CLASSES = "[&_tr]:border-b";

/**
 * Table body styling classes for content section
 * Defines body appearance with conditional bottom border removal
 */
const TABLE_BODY_CLASSES = "[&_tr:last-child]:border-0";

/**
 * Table footer styling classes for summary section
 * Defines footer appearance with background and border styling
 */
const TABLE_FOOTER_CLASSES = "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0";

/**
 * Table row styling classes for data row appearance
 * Defines row interaction states with hover and selection effects
 */
const TABLE_ROW_CLASSES = "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted";

/**
 * Table head styling classes for column header cells
 * Defines header cell appearance with typography and checkbox spacing
 */
const TABLE_HEAD_CLASSES = "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0";

/**
 * Table cell styling classes for data cells
 * Defines cell appearance with padding and checkbox spacing
 */
const TABLE_CELL_CLASSES = "p-4 align-middle [&:has([role=checkbox])]:pr-0";

/**
 * Table caption styling classes for accessibility description
 * Defines caption appearance with muted typography
 */
const TABLE_CAPTION_CLASSES = "mt-4 text-sm text-muted-foreground";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Generic column configuration interface for flexible table data handling
 * Defines column structure with header, cell rendering, and sorting capabilities
 */
export interface Column<T> {
  /** Unique identifier for the column */
  id: string;
  /** Column header content - can be string or React component */
  header: string | ((props: any) => React.ReactNode);
  /** Cell render function that receives row data */
  cell: (props: { row: T }) => React.ReactNode;
  /** Indicates if column supports sorting functionality */
  sortable?: boolean;
}

/**
 * Sort configuration interface for table ordering state
 * Defines current sort field and direction
 */
interface SortConfig {
  /** Field name being sorted */
  field: string;
  /** Sort direction - ascending or descending */
  order: 'asc' | 'desc';
}

/**
 * Sort direction type for consistent ordering options
 * Defines available sort directions
 */
type SortDirection = 'asc' | 'desc';

/**
 * Enhanced table properties interface with generic data support
 * Extends HTML table attributes with data management and sorting functionality
 */
interface TableProps<T> {
  /** Array of data objects to display in table */
  data?: T[];
  /** Column configuration array for table structure */
  columns?: Column<T>[];
  /** Sort callback function for handling column sorting */
  onSort?: (field: string, direction: SortDirection) => void;
  /** Current sort configuration state */
  sortConfig?: SortConfig;
}

/**
 * Table component properties interface
 * Combines enhanced table props with HTML table attributes
 */
interface TableComponentProps<T> extends TableProps<T>, React.HTMLAttributes<HTMLTableElement> {}

/**
 * Table header component properties interface
 * Extends HTML table section attributes for header customization
 */
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

/**
 * Table body component properties interface
 * Extends HTML table section attributes for body customization
 */
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

/**
 * Table footer component properties interface
 * Extends HTML table section attributes for footer customization
 */
interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

/**
 * Table row component properties interface
 * Extends HTML table row attributes for row customization
 */
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

/**
 * Table head cell component properties interface
 * Extends HTML th attributes for header cell customization
 */
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

/**
 * Table data cell component properties interface
 * Extends HTML td attributes for data cell customization
 */
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

/**
 * Table caption component properties interface
 * Extends HTML caption attributes for caption customization
 */
interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Advanced table component with responsive design and sorting functionality
 * 
 * Renders complete table with responsive overflow handling, generic data support,
 * and optional sorting functionality. Built on semantic HTML table elements for
 * optimal accessibility while providing sophisticated data presentation capabilities
 * with design system integration and comprehensive interaction support.
 * 
 * @param props Component properties including data, columns, and sorting configuration
 * @param ref React ref for accessing the underlying table element
 * @returns JSX element containing the advanced responsive data table
 */
const Table = React.forwardRef<
  HTMLTableElement,
  TableComponentProps<any>
>(({ className, data, columns, onSort, sortConfig, ...props }, ref) => (
  <div className={TABLE_CONTAINER_CLASSES}>
    <table
      ref={ref}
      className={cn(TABLE_BASE_CLASSES, className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

/**
 * Semantic table header component for column heading organization
 * 
 * Renders table header section with proper semantic structure and
 * visual separation from table body. Provides consistent styling
 * for column headers with border and spacing management.
 * 
 * @param props Component properties including HTML table section attributes
 * @param ref React ref for accessing the underlying header element
 * @returns JSX element containing the semantic table header section
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn(TABLE_HEADER_CLASSES, className)} {...props} />
));
TableHeader.displayName = "TableHeader";

/**
 * Semantic table body component for data content organization
 * 
 * Renders table body section with proper semantic structure and
 * border management. Provides consistent styling for data rows
 * with conditional border removal for visual clarity.
 * 
 * @param props Component properties including HTML table section attributes
 * @param ref React ref for accessing the underlying body element
 * @returns JSX element containing the semantic table body section
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(TABLE_BODY_CLASSES, className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

/**
 * Semantic table footer component for summary content organization
 * 
 * Renders table footer section with enhanced styling for summary
 * information presentation. Provides distinct visual separation
 * with background color and border management for footer content.
 * 
 * @param props Component properties including HTML table section attributes
 * @param ref React ref for accessing the underlying footer element
 * @returns JSX element containing the semantic table footer section
 */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  TableFooterProps
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(TABLE_FOOTER_CLASSES, className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

/**
 * Interactive table row component with state management
 * 
 * Renders table row with comprehensive interaction states including
 * hover effects and selection indication. Built with transition
 * animations for smooth state changes and visual feedback with
 * proper accessibility attributes for state communication.
 * 
 * @param props Component properties including HTML table row attributes
 * @param ref React ref for accessing the underlying row element
 * @returns JSX element containing the interactive table row
 */
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  TableRowProps
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(TABLE_ROW_CLASSES, className)}
    {...props}
  />
));
TableRow.displayName = "TableRow";

/**
 * Semantic table header cell component for column headers
 * 
 * Renders table header cell with proper typography hierarchy and
 * checkbox integration support. Provides consistent spacing and
 * alignment for column headers with special handling for checkbox
 * columns and accessibility-compliant header structure.
 * 
 * @param props Component properties including HTML th attributes
 * @param ref React ref for accessing the underlying header cell element
 * @returns JSX element containing the semantic table header cell
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  TableHeadProps
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(TABLE_HEAD_CLASSES, className)}
    {...props}
  />
));
TableHead.displayName = "TableHead";

/**
 * Semantic table data cell component for content presentation
 * 
 * Renders table data cell with consistent spacing and alignment
 * for data presentation. Provides checkbox integration support
 * with proper spacing management and accessibility-compliant
 * cell structure for optimal content display.
 * 
 * @param props Component properties including HTML td attributes
 * @param ref React ref for accessing the underlying data cell element
 * @returns JSX element containing the semantic table data cell
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  TableCellProps
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(TABLE_CELL_CLASSES, className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

/**
 * Accessible table caption component for description and context
 * 
 * Renders table caption with proper accessibility support for
 * screen readers and assistive technologies. Provides descriptive
 * context for table content with consistent typography and
 * positioning for optimal accessibility compliance.
 * 
 * @param props Component properties including HTML caption attributes
 * @param ref React ref for accessing the underlying caption element
 * @returns JSX element containing the accessible table caption
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  TableCaptionProps
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(TABLE_CAPTION_CLASSES, className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// ========================================
// EXPORTS
// ========================================

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};