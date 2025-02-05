import { FileTextIcon, Download, Trash2Icon, RefreshCcwIcon, MoreVerticalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileStatus } from "@/types/files";

interface FileActionsProps {
  file: {
    id: string;
    status: FileStatus;
    name: string;
  };
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onDownload?: (id: string) => void;
  onViewDetails?: (file: any) => void;
}

export function FileActions({
  file,
  onDelete,
  onRestore,
  onDownload,
  onViewDetails
}: FileActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted/80 transition-colors rounded-full mx-auto"
        >
          <MoreVerticalIcon className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem onClick={() => onViewDetails(file)}>
            <FileTextIcon className="w-4 h-4 mr-2" />
            View Details
          </DropdownMenuItem>
        )}
        {onDownload && (
          <DropdownMenuItem onClick={() => onDownload(file.id)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </DropdownMenuItem>
        )}
        {file.status === 'deleted' && onRestore ? (
          <DropdownMenuItem onClick={() => onRestore(file.id)}>
            <RefreshCcwIcon className="w-4 h-4 mr-2" />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(file.id)}
          >
            <Trash2Icon className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
