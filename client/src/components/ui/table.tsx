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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

/**
 * Enhanced Logger for Table Operations
 * Provides comprehensive tracking of table interactions and state changes
 */
const tableLogger = {
  sort: (field: string, direction: 'asc' | 'desc') => {
    console.log(`[Table:Sorting] Column: ${field}, Direction: ${direction}`)
  },
  selection: (count: number, total: number) => {
    console.log(`[Table:Selection] Selected: ${count}/${total} items`)
  },
  render: (dataCount: number, columnsCount: number) => {
    console.log(`[Table:Render] Data: ${dataCount} rows, Columns: ${columnsCount}`)
  },
  action: (actionLabel: string, itemId: string) => {
    console.log(`[Table:Action] ${actionLabel} triggered for item: ${itemId}`)
  }
}

/**
 * Enhanced Column Interface for Advanced Table Features
 * Supports sorting, custom cell rendering, and responsive design
 */
export interface Column<T> {
  id: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Enhanced Table Props Interface
 * Comprehensive configuration for enterprise table functionality
 */
interface EnhancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchResults?: Array<{
    item: T;
    matches: Array<{
      indices: Array<[number, number]>;
      key: string;
      value: string;
    }>;
  }>;
  selectable?: boolean;
  selectedItems?: Set<string>;
  getItemId?: (item: T) => string;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (item: T) => void;
  }>;
  emptyState?: React.ReactNode;
  className?: string;
}

/**
 * Enhanced Table Component with Enterprise Features
 * Provides sorting, selection, search highlighting, and actions
 */
function EnhancedTable<T>({
  data,
  columns,
  searchResults,
  selectable = false,
  selectedItems = new Set(),
  getItemId = (item: any) => item.id,
  onSelectionChange,
  onSort,
  sortField,
  sortDirection,
  actions,
  emptyState,
  className,
}: EnhancedTableProps<T>) {
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);

  // Log table rendering for debugging
  React.useEffect(() => {
    tableLogger.render(data.length, columns.length);
  }, [data.length, columns.length]);

  // Handle column sorting with logging
  const handleSort = React.useCallback((columnId: string) => {
    if (!onSort) return;
    
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    const newDirection = sortField === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
    tableLogger.sort(columnId, newDirection);
    onSort(columnId, newDirection);
  }, [columns, onSort, sortField, sortDirection]);

  // Handle selection changes with logging
  const handleSelectionChange = React.useCallback((itemId: string, checked: boolean) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    
    tableLogger.selection(newSelection.size, data.length);
    onSelectionChange(newSelection);
  }, [selectedItems, onSelectionChange, data.length]);

  // Handle select all functionality
  const handleSelectAll = React.useCallback((checked: boolean) => {
    if (!onSelectionChange) return;

    const newSelection = checked ? new Set(data.map(getItemId)) : new Set<string>();
    tableLogger.selection(newSelection.size, data.length);
    onSelectionChange(newSelection);
  }, [data, getItemId, onSelectionChange]);

  // Calculate selection state
  const isAllSelected = data.length > 0 && selectedItems.size === data.length;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < data.length;

  // Empty state rendering
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {emptyState || (
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">There are no items to display at the moment.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
                      if (checkbox) checkbox.indeterminate = isIndeterminate;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  column.className,
                  column.sortable && "cursor-pointer select-none hover:bg-muted/50"
                )}
                style={{
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                }}
                onClick={() => column.sortable && handleSort(column.id)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && (
                    <div className="ml-auto">
                      {sortField === column.id ? (
                        sortDirection === 'asc' ? (
                          <ArrowUpIcon className="h-4 w-4" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDownIcon className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  )}
                </div>
              </TableHead>
            ))}
            {actions && actions.length > 0 && (
              <TableHead className="w-[70px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const itemId = getItemId(item);
            const isSelected = selectedItems.has(itemId);
            const isHovered = hoveredRow === itemId;

            return (
              <TableRow
                key={itemId}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                  "group",
                  isHovered && "bg-muted/30"
                )}
                onMouseEnter={() => setHoveredRow(itemId)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {selectable && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleSelectionChange(itemId, checked as boolean)
                      }
                      aria-label={`Select row ${itemId}`}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={column.className}
                    style={{
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                  >
                    {column.cell(item)}
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={() => {
                              tableLogger.action(action.label, itemId);
                              action.onClick(item);
                            }}
                          >
                            {action.icon && (
                              <span className="mr-2">{action.icon}</span>
                            )}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
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
  EnhancedTable,
}

export type { Column };