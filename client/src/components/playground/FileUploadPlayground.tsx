import React, { useState } from 'react';
import { FileUploadZone } from '../files/FileUploadZone';
import { DragDropProvider } from '../files/DragDropProvider';
import { FileUploadPreview } from '../files/FileUploadPreview';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface UploadingFile extends File {
  id: string;
  progress: number;
  error?: string;
}

export function FileUploadPlayground() {
  const [variant, setVariant] = useState<'box' | 'row'>('box');
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragDropEnabled, setIsDragDropEnabled] = useState(false);

  const handleFilesAccepted = (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).slice(2),
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach(file => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        setFiles(prev => 
          prev.map(f => 
            f.id === file.id 
              ? { ...f, progress } 
              : f
          )
        );
      }, 500);
    });
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="variant-switch"
            checked={variant === 'row'}
            onCheckedChange={(checked) => setVariant(checked ? 'row' : 'box')}
          />
          <Label htmlFor="variant-switch">Compact Mode</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="dragdrop-switch"
            checked={isDragDropEnabled}
            onCheckedChange={setIsDragDropEnabled}
          />
          <Label htmlFor="dragdrop-switch">Enable Page DragDrop</Label>
        </div>
      </div>

      <FileUploadZone
        variant={variant}
        onFilesAccepted={handleFilesAccepted}
      />

      <div className="space-y-2">
        {files.map((file) => (
          <FileUploadPreview
            key={file.id}
            file={file}
            progress={file.progress}
            error={file.error}
            onRemove={() => handleRemoveFile(file.id)}
            variant={variant === 'row' ? 'compact' : 'default'}
          />
        ))}
      </div>
    </div>
  );

  if (isDragDropEnabled) {
    return (
      <DragDropProvider
        onFilesAccepted={handleFilesAccepted}
        className="min-h-[400px] rounded-lg transition-colors duration-200"
        activeClassName="bg-primary/5 border-2 border-dashed border-primary/30"
      >
        {({ isDragActive }) => (
          <div className="relative">
            {isDragActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <p className="text-lg font-medium">Drop files here</p>
              </div>
            )}
            {content}
          </div>
        )}
      </DragDropProvider>
    );
  }

  return content;
}

export default FileUploadPlayground;