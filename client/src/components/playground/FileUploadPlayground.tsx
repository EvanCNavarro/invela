import React, { useState } from 'react';
import { FileUploadZone } from '../files/FileUploadZone';
import { DragDropProvider } from '../files/DragDropProvider';
import { FileUploadPreview } from '../files/FileUploadPreview';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUnifiedToast } from '@/hooks/use-unified-toast';

interface UploadingFile extends File {
  id: string;
  progress: number;
  error?: string;
}

export function FileUploadPlayground() {
  const [variant, setVariant] = useState<'box' | 'row'>('box');
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragDropEnabled, setIsDragDropEnabled] = useState(false);
  const unifiedToast = useUnifiedToast();

  const handleFilesAccepted = (acceptedFiles: File[]) => {
    console.log('Accepted files:', acceptedFiles.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toLocaleString()
    })));

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

          // Check if all files are at 100%
          setFiles(prev => {
            const updatedFiles = prev.map(f => 
              f.id === file.id ? { ...f, progress } : f
            );

            // If all files are at 100%, show success toast
            if (updatedFiles.every(f => f.progress === 100)) {
              unifiedToast.success(
                "Upload Complete", 
                `Successfully uploaded ${updatedFiles.length} file${updatedFiles.length !== 1 ? 's' : ''}.`
              );
            }

            return updatedFiles;
          });
        } else {
          setFiles(prev => 
            prev.map(f => 
              f.id === file.id 
                ? { ...f, progress } 
                : f
            )
          );
        }
      }, 500);
    });
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId
        ? { ...f, name: newName }
        : f
    ));
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
            onRename={(newName) => handleRenameFile(file.id, newName)}
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