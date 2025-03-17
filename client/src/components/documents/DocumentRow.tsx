import React from 'react';
import { Circle, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DocumentRowProps {
  file: {
    name: string;
    size: number;
    status: 'uploaded' | 'processing' | 'classified';
    answersFound?: number;
  };
}

export function DocumentRow({ file }: DocumentRowProps) {
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
      timestamp: new Date().toISOString()
    });
  }, [file.status, file.answersFound]);

  // Get status icon based on document state
  const StatusIcon = () => {
    switch (file.status) {
      case 'classified':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <LoadingSpinner size="sm" className="text-blue-500" />;
      default:
        return <CircleDashed className="h-5 w-5 text-gray-400" />;
    }
  };

  // Get processing context text and style
  const ProcessingContext = () => {
    switch (file.status) {
      case 'classified':
        return (
          <span className="text-green-600 font-medium">
            {file.answersFound} Answers Found
          </span>
        );
      case 'processing':
        return (
          <span className="text-blue-600">
            (Processing Document...)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border",
        file.status === 'processing' && "bg-blue-50/50 border-blue-200",
        file.status !== 'processing' && "border-transparent"
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