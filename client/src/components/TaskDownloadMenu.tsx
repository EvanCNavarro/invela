import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, FileJson } from "lucide-react";

interface TaskDownloadMenuProps {
  onDownload: (format: 'csv' | 'txt' | 'json') => void;
}

export const TaskDownloadMenu: React.FC<TaskDownloadMenuProps> = ({
  onDownload
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onDownload('csv')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Download as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload('txt')}>
          <FileText className="mr-2 h-4 w-4" />
          Download as TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload('json')}>
          <FileJson className="mr-2 h-4 w-4" />
          Download as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};