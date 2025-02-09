import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon, MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ColumnType = 'checkbox' | 'icon' | 'status' | 'actions' | 'view' | 'text';

interface Column {
  key: string;
  header: string;
  type?: ColumnType;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column[];
  isLoading?: boolean;
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSort?: (key: string) => void;
  selectedRows?: Set<number>;
  onRowSelect?: (id: number) => void;
  onSelectAll?: () => void;
}

export function DataTable<T extends Record<string, any>>({ 
  data,
  columns,
  isLoading,
  sortConfig,
  onSort,
  selectedRows = new Set(),
  onRowSelect,
  onSelectAll,
}: DataTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUpIcon className="h-4 w-4 text-primary" />
      : <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'success';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const renderCell = (column: Column, value: any, rowId: number) => {
    switch (column.type) {
      case 'checkbox':
        return (
          <Checkbox
            checked={selectedRows.has(rowId)}
            onCheckedChange={() => onRowSelect?.(rowId)}
          />
        );
      case 'icon':
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <div className="bg-primary/10 text-primary rounded-full w-full h-full flex items-center justify-center">
                {String(value || '?').charAt(0).toUpperCase()}
              </div>
            </Avatar>
            <span>{value}</span>
          </div>
        );
      case 'status':
        return value ? (
          <Badge variant={getStatusBadgeVariant(value)}>
            {value}
          </Badge>
        ) : null;
      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      case 'view':
        return (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ExternalLink className="h-4 w-4" />
          </Button>
        );
      default:
        return value ?? '-';
    }
  };

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={index} className="animate-pulse">
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <div className="h-4 bg-muted rounded w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key}>
              {column.type === 'checkbox' ? (
                <Checkbox
                  checked={selectedRows.size === data.length}
                  onCheckedChange={onSelectAll}
                />
              ) : column.sortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => onSort?.(column.key)}
                >
                  {column.header}
                  {getSortIcon(column.key)}
                </Button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={row.id || index} className={selectedRows.has(row.id || index) ? 'bg-primary/5' : undefined}>
            {columns.map((column) => (
              <TableCell key={column.key}>
                {renderCell(column, row[column.key], row.id || index)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}