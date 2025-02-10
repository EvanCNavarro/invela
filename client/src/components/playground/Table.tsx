import * as React from "react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  minWidth?: number;
  maxWidth?: number;
}

interface TableProps<T> {
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

export function Table<T>({
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
}: TableProps<T>) {
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);

  const getSortIcon = (columnId: string) => {
    if (columnId !== sortField) return <ArrowUpDownIcon className="h-4 w-4" />;
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="h-4 w-4" />
    ) : (
      <ArrowDownIcon className="h-4 w-4" />
    );
  };

  const handleSort = (columnId: string) => {
    if (!onSort) return;
    const newDirection =
      columnId === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnId, newDirection);
  };

  const toggleAllRows = () => {
    if (!onSelectionChange) return;
    if (selectedItems.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getItemId)));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  const highlightMatches = (text: string, itemMatches?: typeof searchResults[0]['matches']) => {
    if (!itemMatches) return text;
    
    const matches = itemMatches.filter(m => m.value === text);
    if (!matches.length) return text;

    let result = '';
    let lastIndex = 0;

    matches[0].indices.forEach(([start, end]) => {
      result += text.slice(lastIndex, start);
      result += `<span class="bg-blue-100 dark:bg-blue-900">${text.slice(start, end + 1)}</span>`;
      lastIndex = end + 1;
    });

    result += text.slice(lastIndex);
    return result;
  };

  return (
    <div className={cn("rounded-md border", className)}>
      <UITable>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-[40px] px-2">
                <Checkbox
                  checked={selectedItems.size === data.length}
                  onCheckedChange={toggleAllRows}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  column.className,
                  column.sortable && "cursor-pointer select-none",
                  {
                    "min-w-[": column.minWidth,
                    "max-w-[": column.maxWidth,
                  }
                )}
                onClick={column.sortable ? () => handleSort(column.id) : undefined}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && getSortIcon(column.id)}
                </div>
              </TableHead>
            ))}
            {actions && <TableHead className="w-[40px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                className="h-32 text-center"
              >
                {emptyState || (
                  <div className="text-muted-foreground">No items found</div>
                )}
              </TableCell>
            </TableRow>
          )}
          {data.map((item) => {
            const id = getItemId(item);
            const searchResult = searchResults?.find(
              (result) => getItemId(result.item) === id
            );

            return (
              <TableRow
                key={id}
                onMouseEnter={() => setHoveredRow(id)}
                onMouseLeave={() => setHoveredRow(null)}
                className="group"
              >
                {selectable && (
                  <TableCell className="w-[40px] px-2">
                    <Checkbox
                      checked={selectedItems.has(id)}
                      onCheckedChange={() => toggleRow(id)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(column.className)}
                  >
                    {typeof column.cell(item) === 'string' ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: highlightMatches(
                            column.cell(item) as string,
                            searchResult?.matches
                          ),
                        }}
                      />
                    ) : (
                      column.cell(item)
                    )}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell className="w-[40px] px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 p-0",
                            hoveredRow === id
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, index) => (
                          <React.Fragment key={action.label}>
                            <DropdownMenuItem
                              onClick={() => action.onClick(item)}
                            >
                              {action.icon}
                              {action.label}
                            </DropdownMenuItem>
                            {index < actions.length - 1 && <DropdownMenuSeparator />}
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </UITable>
    </div>
  );
}
