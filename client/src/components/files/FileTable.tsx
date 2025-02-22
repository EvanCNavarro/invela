import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FileIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { FileStatus } from "@/types/files";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortField = 'name' | 'size' | 'createdAt' | 'status';
export type SortOrder = 'asc' | 'desc';

interface TableItem {
  id: string;
  name: string;
  size: number;
  status: FileStatus;
  createdAt: string;
  [key: string]: any;
}

interface FileTableProps<T extends TableItem> {
  data: T[];
  sortConfig: {
    field: SortField;
    order: SortOrder;
  };
  onSort: (field: SortField) => void;
  selectedItems: Set<string>;
  onSelectItem: (id: string) => void;
  onSelectAll: (items: T[]) => void;
  formatFileSize: (size: number) => string;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  isLoading?: boolean;
}

export function FileTable<T extends TableItem>({
  data,
  sortConfig,
  onSort,
  selectedItems,
  onSelectItem,
  onSelectAll,
  formatFileSize,
  onDelete,
  onDownload,
  isLoading = false,
}: FileTableProps<T>) {
  useEffect(() => {
    console.log('[FileTable Debug] Component mounted/updated:', {
      dataLength: data.length,
      firstItem: data[0],
      selectedItemsCount: selectedItems.size,
      isLoading
    });
  }, [data, selectedItems.size, isLoading]);

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />;
    return sortConfig.order === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-primary" /> :
      <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">
            <Checkbox
              checked={selectedItems.size === data.length && data.length > 0}
              onCheckedChange={() => onSelectAll(data)}
              aria-label="Select all files"
            />
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => onSort('name')}
              className="flex items-center gap-2"
            >
              File Name {getSortIcon('name')}
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => onSort('size')}
              className="flex items-center gap-2"
            >
              Size {getSortIcon('size')}
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => onSort('status')}
              className="flex items-center gap-2"
            >
              Status {getSortIcon('status')}
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              onClick={() => onSort('createdAt')}
              className="flex items-center gap-2"
            >
              Created At {getSortIcon('createdAt')}
            </Button>
          </TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton columns={6} />
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No files found
            </TableCell>
          </TableRow>
        ) : (
          data.map((item) => {
            console.log('[FileTable Debug] Rendering row:', item);
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => onSelectItem(item.id)}
                    aria-label={`Select ${item.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell>{formatFileSize(item.size)}</TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    item.status === 'uploaded' && "bg-green-100 text-green-800",
                    item.status === 'uploading' && "bg-blue-100 text-blue-800",
                    item.status === 'error' && "bg-red-100 text-red-800"
                  )}>
                    {item.status}
                  </span>
                </TableCell>
                <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <ArrowUpDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onDownload && (
                        <DropdownMenuItem onClick={() => onDownload(item.id)}>
                          Download
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(item.id)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

const TableSkeleton = ({ columns }: { columns: number }) => (
  <>
    {Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index} className="animate-pulse">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <TableCell key={colIndex}>
            <div className="h-4 w-full bg-muted rounded" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);