import React, { useState } from 'react';
import { X, File as FileIcon, Image as ImageIcon, FileText, Info, MoreVertical, Edit2, Check, XCircle, Pencil, Eye, Trash2, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileUploadPreviewProps {
  file: File;
  progress?: number;
  onRemove?: () => void;
  error?: string;
  className?: string;
  variant?: 'default' | 'compact';
  onRename?: (newName: string) => void;
}

const getFileIcon = (type: string | undefined) => {
  if (!type) return FileIcon;
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('text/')) return FileText;
  return FileIcon;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export function FileUploadPreview({
  file,
  progress,
  onRemove,
  error,
  className,
  variant = 'default',
  onRename
}: FileUploadPreviewProps) {
  const FileTypeIcon = getFileIcon(file?.type);
  const fileSize = formatFileSize(file?.size || 0);
  const isComplete = progress === 100;
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(file?.name || '');
  const [showDetails, setShowDetails] = useState(false);

  const handleRename = () => {
    if (onRename && editedName.trim()) {
      onRename(editedName);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(file?.name || '');
    setIsEditing(false);
  };

  const fileDetails = {
    "File Name": file?.name,
    "File Type": file?.type || "Unknown",
    "File Size": fileSize,
    "Last Modified": new Date(file?.lastModified || 0).toLocaleString(),
    "Upload Status": isComplete ? "Complete" : "In Progress",
    "Upload Progress": isComplete ? "100%" : `${progress?.toFixed(0)}%`
  };

  return (
    <>
      <div className={cn(
        "relative px-4 py-3 rounded-lg",
        isComplete ? "bg-[#E5F6F1]/30" : "bg-muted/30",
        error ? "border-destructive/50 bg-destructive/5" : "",
        className
      )}>
        <div className="flex items-start gap-3">
          {/* Left section: Icon and file details */}
          <div className="flex gap-3 flex-1 min-w-0">
            <FileTypeIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleRename}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCancelEdit}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium truncate">{file?.name}</p>
                    {isComplete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
                {variant === 'compact' ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{fileSize}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <p className="text-xs text-muted-foreground">{fileSize}</p>
                )}
              </div>

              {/* Success message when upload is complete */}
              {isComplete && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-[#22c55e] fill-[#22c55e]" />
                  <span className="text-sm">Upload Complete</span>
                </div>
              )}
            </div>
          </div>

          {/* Right section: Remove button/menu and progress */}
          <div className="flex items-center">
            {isComplete ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDetails(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onRemove}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : onRemove ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}

            {typeof progress === 'number' && !isComplete && (
              <p className="text-xs text-muted-foreground ml-2">
                {progress === 100 ? '100%' : progress.toFixed(0) + '%'}
              </p>
            )}
          </div>
        </div>

        {/* Bottom section: Progress bar */}
        {typeof progress === 'number' && !error && !isComplete && (
          <div className="mt-2">
            <Progress 
              value={progress} 
              className="h-1 bg-primary/20" 
            />
          </div>
        )}

        {error && (
          <p className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* File Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
            <DialogDescription>
              <div className="mt-4 space-y-3">
                {Object.entries(fileDetails).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{key}:</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}