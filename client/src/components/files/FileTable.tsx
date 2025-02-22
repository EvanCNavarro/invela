import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { FileNameCell } from "./FileNameCell";
import { FileStatus } from "@/types/files";
import { FileActions } from "./FileActions";

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
  getStatusStyles: (status: FileStatus) => string;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onDownload?: (id: string) => void;
  onViewDetails?: (item: T) => void;
  visibleColumns?: Set<string>;
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
  getStatusStyles,
  onDelete,
  onRestore,
  onDownload,
  onViewDetails,
  visibleColumns = new Set(['fileName', 'size', 'status', 'createdAt', 'actions']),
  isLoading = false,
}: FileTableProps<T>) {
  console.log('[FileTable Debug] Received props:', {
    dataLength: data.length,
    firstItem: data[0],
    selectedItemsCount: selectedItems.size,
    visibleColumns,
    isLoading
  });

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
          <TableCell className="w-[40px]">
            <Checkbox
              checked={selectedItems.size === data.length && data.length > 0}
              onCheckedChange={() => onSelectAll(data)}
              aria-label="Select all files"
            />
          </TableCell>
          {visibleColumns.has('fileName') && (
            <TableCell>
              <Button
                variant="ghost"
                onClick={() => onSort('name')}
                className="flex items-center gap-2"
              >
                File Name {getSortIcon('name')}
              </Button>
            </TableCell>
          )}
          {visibleColumns.has('size') && (
            <TableCell>
              <Button
                variant="ghost"
                onClick={() => onSort('size')}
                className="flex items-center gap-2 ml-auto"
              >
                Size {getSortIcon('size')}
              </Button>
            </TableCell>
          )}
          {visibleColumns.has('status') && (
            <TableCell>
              <Button
                variant="ghost"
                onClick={() => onSort('status')}
                className="flex items-center gap-2 ml-auto"
              >
                Status {getSortIcon('status')}
              </Button>
            </TableCell>
          )}
          {visibleColumns.has('createdAt') && (
            <TableCell>
              <Button
                variant="ghost"
                onClick={() => onSort('createdAt')}
                className="flex items-center gap-2 ml-auto"
              >
                Created At {getSortIcon('createdAt')}
              </Button>
            </TableCell>
          )}
          {visibleColumns.has('actions') && (
            <TableCell className="text-center">Actions</TableCell>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton columns={visibleColumns.size + 1} />
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
                {visibleColumns.has('fileName') && (
                  <TableCell>
                    <FileNameCell file={item} />
                  </TableCell>
                )}
                {visibleColumns.has('size') && (
                  <TableCell className="text-right">
                    {formatFileSize(item.size)}
                  </TableCell>
                )}
                {visibleColumns.has('status') && (
                  <TableCell className="text-right">
                    <span className={cn(getStatusStyles(item.status))}>
                      {item.status}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.has('createdAt') && (
                  <TableCell className="text-right">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                )}
                {visibleColumns.has('actions') && (
                  <TableCell>
                    <FileActions
                      file={item}
                      onDelete={onDelete}
                      onRestore={onRestore}
                      onDownload={onDownload}
                      onViewDetails={onViewDetails}
                    />
                  </TableCell>
                )}
              </TableRow>
            )
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