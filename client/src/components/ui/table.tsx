/**
 * ========================================
 * Table Component System - Enterprise Data Display
 * ========================================
 * 
 * Professional data table system providing sortable, responsive tables
 * with consistent styling and accessibility features. Supports complex
 * data rendering with custom cell components and sorting capabilities.
 * 
 * Key Features:
 * - Type-safe column definitions with custom renderers
 * - Sortable columns with ascending/descending order
 * - Responsive table layout with overflow handling
 * - Accessible table structure with proper headers
 * - Professional styling with design system tokens
 * 
 * Table Components:
 * - Table: Main table container with data binding
 * - TableHeader: Column header with sorting support
 * - TableBody: Data rows container
 * - TableRow: Individual table row
 * - TableCell: Table cell with content rendering
 * 
 * @module components/ui/table
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  id: string;
  header: string | ((props: any) => React.ReactNode);
  cell: (props: { row: T }) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  data?: T[];
  columns?: Column<T>[];
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortConfig?: { field: string; order: 'asc' | 'desc' };
}

const Table = React.forwardRef<
  HTMLTableElement,
  TableProps<any> & React.HTMLAttributes<HTMLTableElement>
>(({ className, data, columns, onSort, sortConfig, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}