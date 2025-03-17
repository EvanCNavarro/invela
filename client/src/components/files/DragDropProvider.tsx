import React from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface DragDropProviderProps {
  onFilesAccepted: (files: File[]) => void;
  children: React.ReactNode | ((props: {
    isDragActive: boolean;
    isDragAccept: boolean;
    isDragReject: boolean;
  }) => React.ReactNode);
  acceptedFileTypes?: string[];
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
  rejectClassName?: string;
}

export function DragDropProvider({
  onFilesAccepted,
  children,
  acceptedFileTypes,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024,
  disabled = false,
  className,
  activeClassName,
  rejectClassName,
}: DragDropProviderProps) {
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    accept: acceptedFileTypes?.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    maxSize,
    disabled,
    onDrop: onFilesAccepted,
  });

  const dragDropClasses = cn(
    className,
    {
      [activeClassName || 'border-primary/30 bg-primary/10']: isDragActive && !isDragReject,
      [rejectClassName || 'border-destructive/30 bg-destructive/10']: isDragReject,
    }
  );

  return (
    <div {...getRootProps({ className: dragDropClasses })}>
      <input {...getInputProps()} />
      {typeof children === 'function'
        ? children({ isDragActive, isDragAccept, isDragReject })
        : children}
    </div>
  );
}