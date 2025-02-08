import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileStatus } from "@/types/files";
import { Player } from "@lordicon/react";
import moreVertical from "@/assets/lordicon/more-vertical.json";
import fileText from "@/assets/lordicon/file-text.json";
import downloadIcon from "@/assets/lordicon/download.json";
import trashIcon from "@/assets/lordicon/trash.json";
import refreshIcon from "@/assets/lordicon/refresh.json";

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
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  const renderIcon = (icon: any, state: string) => (
    <div className="flex items-center">
      <Player
        icon={icon}
        size={24}
        state={state}
      />
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted/80 transition-colors rounded-full mx-auto"
          onMouseEnter={() => setHoveredIcon("more")}
          onMouseLeave={() => setHoveredIcon(null)}
        >
          {renderIcon(moreVertical, hoveredIcon === "more" ? "hover" : "loop")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem 
            onClick={() => onViewDetails(file)}
            onMouseEnter={() => setHoveredIcon("file")}
            onMouseLeave={() => setHoveredIcon(null)}
            className="gap-2"
          >
            {renderIcon(fileText, hoveredIcon === "file" ? "hover" : "loop")}
            View Details
          </DropdownMenuItem>
        )}
        {onDownload && (
          <DropdownMenuItem 
            onClick={() => onDownload(file.id)}
            onMouseEnter={() => setHoveredIcon("download")}
            onMouseLeave={() => setHoveredIcon(null)}
            className="gap-2"
          >
            {renderIcon(downloadIcon, hoveredIcon === "download" ? "hover" : "loop")}
            Download
          </DropdownMenuItem>
        )}
        {file.status === 'deleted' && onRestore ? (
          <DropdownMenuItem 
            onClick={() => onRestore(file.id)}
            onMouseEnter={() => setHoveredIcon("restore")}
            onMouseLeave={() => setHoveredIcon(null)}
            className="gap-2"
          >
            {renderIcon(refreshIcon, hoveredIcon === "restore" ? "hover" : "loop")}
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive gap-2"
            onClick={() => onDelete(file.id)}
            onMouseEnter={() => setHoveredIcon("delete")}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            {renderIcon(trashIcon, hoveredIcon === "delete" ? "hover-error" : "loop")}
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}