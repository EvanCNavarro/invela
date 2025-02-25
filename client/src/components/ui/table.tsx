import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface Column<T> {
  id: string;
  header: string | ((props: any) => React.ReactNode);
  cell: (props: { row: T }) => React.ReactNode;
  sortable?: boolean;
  /**
   * Minimum width for the column
   */
  minWidth?: string;
  /**
   * Maximum width for the column
   */
  maxWidth?: string;
  /**
   * Whether to hide this column on small screens
   */
  hideOnMobile?: boolean;
  /**
   * Alignment of the column content
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Custom class name for the column
   */
  className?: string;
}

export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

export interface TableProps<T> {
  /**
   * Data to display in the table
   */
  data?: T[];
  /**
   * Column definitions
   */
  columns?: Column<T>[];
  /**
   * Callback when sorting changes
   */
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  /**
   * Current sort configuration
   */
  sortConfig?: SortConfig;
  /**
   * Whether the table is in a loading state
   */
  isLoading?: boolean;
  /**
   * Message to display when there is no data
   */
  emptyMessage?: string;
  /**
   * Whether the table should have zebra striping
   */
  striped?: boolean;
  /**
   * Whether the table should be compact
   */
  compact?: boolean;
  /**
   * Whether the table should have hover effects
   */
  hover?: boolean;
}

/**
 * Responsive table component with sorting capabilities
 */
const Table = React.forwardRef<
  HTMLTableElement,
  TableProps<any> & React.HTMLAttributes<HTMLTableElement>
>(({ 
  className, 
  data = [], 
  columns = [], 
  onSort, 
  sortConfig, 
  isLoading,
  emptyMessage = "No data available",
  striped,
  compact,
  hover,
  ...props 
}, ref) => {
  // Handle sort click
  const handleSortClick = React.useCallback((field: string) => {
    if (!onSort) return;
    
    const isCurrentlySorted = sortConfig?.field === field;
    const newDirection = isCurrentlySorted && sortConfig?.order === 'asc' ? 'desc' : 'asc';
    
    onSort(field, newDirection);
  }, [onSort, sortConfig]);
  
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-sm",
          striped && "[&_tbody_tr:nth-child(odd)]:bg-muted/50",
          compact && "[&_th]:py-2 [&_td]:py-2",
          className
        )}
        {...props}
      >
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                onClick={column.sortable ? () => handleSortClick(column.id) : undefined}
                className={cn(
                  column.sortable && "cursor-pointer select-none",
                  column.hideOnMobile && "hidden sm:table-cell",
                  column.align === 'center' && "text-center",
                  column.align === 'right' && "text-right",
                  column.className
                )}
                style={{
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                }}
                aria-sort={
                  sortConfig?.field === column.id
                    ? sortConfig.order === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <div className="flex items-center gap-1">
                  {typeof column.header === 'function' 
                    ? column.header({}) 
                    : column.header}
                  
                  {column.sortable && (
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={cn(
                          "h-3 w-3 transition-colors",
                          sortConfig?.field === column.id && sortConfig.order === 'asc'
                            ? "text-foreground"
                            : "text-muted-foreground/30"
                        )}
                        aria-hidden="true"
                      />
                      <ChevronDown 
                        className={cn(
                          "h-3 w-3 -mt-1 transition-colors",
                          sortConfig?.field === column.id && sortConfig.order === 'desc'
                            ? "text-foreground"
                            : "text-muted-foreground/30"
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="h-24 text-center"
              >
                <div className="flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="ml-2">Loading...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex}
                className={cn(
                  hover && "hover:bg-muted/50",
                )}
              >
                {columns.map((column) => (
                  <TableCell 
                    key={`${rowIndex}-${column.id}`}
                    className={cn(
                      column.hideOnMobile && "hidden sm:table-cell",
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right",
                      column.className
                    )}
                  >
                    {column.cell({ row })}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </div>
  )
})
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn("[&_tr]:border-b", className)} 
    {...props} 
  />
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
      "border-b transition-colors data-[state=selected]:bg-muted",
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