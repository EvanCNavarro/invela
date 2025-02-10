import { type Column } from "../playground/Table";
import { type FileItem } from "@/types/files";
import { FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FileStatus } from "@/types/files";

// Utility function for status styling
export const getStatusStyles = (status: FileStatus) => {
  const baseStyles = "rounded-full px-2.5 py-1 text-xs font-medium";
  const statusMap = {
    uploaded: "bg-[#ECFDF3] text-[#027A48]",
    restored: "bg-[#ECFDF3] text-[#027A48]",
    uploading: "bg-[#FFF4ED] text-[#B93815]",
    paused: "bg-[#F2F4F7] text-[#344054]",
    canceled: "bg-[#FFF1F3] text-[#C01048]",
    deleted: "bg-[#FFF1F3] text-[#C01048]"
  };
  return `${baseStyles} ${statusMap[status] || "text-muted-foreground"}`;
};

// Utility function for file size formatting
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileColumns = (): Column<FileItem>[] => [
  {
    id: 'name',
    header: 'Name',
    cell: (item) => (
      <div className="flex items-center gap-2 min-w-0 max-w-[14rem]">
        <div className="w-6 h-6 rounded flex items-center justify-center bg-[hsl(230,96%,96%)] flex-shrink-0">
          <FileIcon className="w-3 h-3 text-primary" />
        </div>
        <span className="truncate block min-w-0 flex-1">{item.name}</span>
      </div>
    ),
    sortable: true,
    className: 'w-[300px]',
  },
  {
    id: 'size',
    header: 'Size',
    cell: (item) => formatFileSize(item.size),
    sortable: true,
    className: 'text-right',
  },
  {
    id: 'status',
    header: 'Status',
    cell: (item) => (
      <span className={getStatusStyles(item.status)}>
        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
      </span>
    ),
    sortable: true,
  },
  {
    id: 'createdAt',
    header: 'Upload Date',
    cell: (item) => new Date(item.createdAt).toLocaleDateString(),
    sortable: true,
  },
  {
    id: 'version',
    header: 'Version',
    cell: (item) => `v${item.version?.toFixed(1) || '1.0'}`,
    sortable: true,
  },
];
