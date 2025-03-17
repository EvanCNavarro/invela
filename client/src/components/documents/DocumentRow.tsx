import React from 'react';
import { Circle, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DocumentStatus, DocumentRowFile } from './types';

interface DocumentRowProps {
  file: DocumentRowFile;
  isActive?: boolean;
}

export function DocumentRow({ file, isActive = false }: DocumentRowProps) {
  // Format file size to human readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Log status changes
  React.useEffect(() => {
    console.log('[DocumentRow] Status update:', {
      fileName: file.name,
      status: file.status,
      answersFound: file.answersFound,
      isActive,
      timestamp: new Date().toISOString()
    });
  }, [file.status, file.answersFound, isActive, file.name]);

  // Get status icon based on document state
  const StatusIcon = () => {
    switch (file.status) {
      case 'uploaded':
      case 'processed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <LoadingSpinner size="sm" className="text-blue-500" />;
      case 'error':
        return <Circle className="h-5 w-5 text-red-500" />;
      default:
        return <CircleDashed className="h-5 w-5 text-gray-400" />;
    }
  };

  // Get processing context text and style
  const ProcessingContext = () => {
    switch (file.status) {
      case 'uploaded':
      case 'processed':
        return (
          <span className="text-green-600 font-medium">
            {file.answersFound} Answers Found
          </span>
        );
      case 'processing':
        return (
          <span className="text-blue-600">
            {isActive ? '(Processing Document...)' : '(Waiting...)'}
          </span>
        );
      case 'error':
        return (
          <span className="text-red-600">
            {file.error || 'Error processing document'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-colors duration-200",
        isActive && "bg-blue-50/50 border-blue-200",
        !isActive && file.status === 'processing' && "bg-gray-50/50 border-gray-200",
        file.status === 'error' && "bg-red-50/50 border-red-200",
        file.status !== 'processing' && !isActive && "border-transparent"
      )}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        <StatusIcon />
      </div>

      {/* File Details */}
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{file.name}</span>
            <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
          </div>
          <ProcessingContext />
        </div>
      </div>
    </div>
  );
}