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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted/80 transition-colors rounded-full mx-auto"
        >
          <Player
            icon={moreVertical}
            size={24}
            state={hoveredIcon === "more" ? "hover" : "loop"}
            onMouseEnter={() => setHoveredIcon("more")}
            onMouseLeave={() => setHoveredIcon(null)}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem 
            onClick={() => onViewDetails(file)}
            onMouseEnter={() => setHoveredIcon("file")}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <Player
              icon={fileText}
              size={24}
              className="mr-2"
              state={hoveredIcon === "file" ? "hover" : "loop"}
            />
            View Details
          </DropdownMenuItem>
        )}
        {onDownload && (
          <DropdownMenuItem 
            onClick={() => onDownload(file.id)}
            onMouseEnter={() => setHoveredIcon("download")}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <Player
              icon={downloadIcon}
              size={24}
              className="mr-2"
              state={hoveredIcon === "download" ? "hover" : "loop"}
            />
            Download
          </DropdownMenuItem>
        )}
        {file.status === 'deleted' && onRestore ? (
          <DropdownMenuItem 
            onClick={() => onRestore(file.id)}
            onMouseEnter={() => setHoveredIcon("restore")}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <Player
              icon={refreshIcon}
              size={24}
              className="mr-2"
              state={hoveredIcon === "restore" ? "hover" : "loop"}
            />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(file.id)}
            onMouseEnter={() => setHoveredIcon("delete")}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <Player
              icon={trashIcon}
              size={24}
              className="mr-2"
              state={hoveredIcon === "delete" ? "hover-error" : "loop"}
            />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}