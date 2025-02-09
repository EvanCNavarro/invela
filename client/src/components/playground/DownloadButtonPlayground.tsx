import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMutation } from '@tanstack/react-query';

interface DownloadButtonProps {
  // Core props
  fileIds: string[];
  onDownloadComplete?: () => void;
  onDownloadError?: (error: Error) => void;
  
  // Visual customization
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  customIcon?: React.ReactNode;
  text?: string;
  
  // Behavior customization
  showToast?: boolean;
  downloadFileName?: string;
  isBulkDownload?: boolean;
}

const formatTimestampForFilename = () => {
  const now = new Date();
  return now.toISOString().split('.')[0].replace(/[:]/g, '-');
};

export const DownloadButton = ({
  fileIds,
  onDownloadComplete,
  onDownloadError,
  variant = 'default',
  size = 'default',
  showIcon = true,
  customIcon,
  text = 'Download',
  showToast = true,
  downloadFileName,
  isBulkDownload = false,
}: DownloadButtonProps) => {
  const { toast } = useToast();

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (fileIds.length === 0) {
        throw new Error('No files selected for download');
      }

      const endpoint = isBulkDownload ? '/api/files/download-bulk' : `/api/files/${fileIds[0]}/download`;
      const method = isBulkDownload ? 'POST' : 'GET';
      const body = isBulkDownload ? JSON.stringify({ fileIds }) : undefined;

      const downloadToast = showToast && toast({
        title: "Preparing Download",
        description: (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {isBulkDownload
                ? `Preparing ${fileIds.length} files for download...`
                : 'Preparing download...'}
            </span>
          </div>
        ),
        duration: 0,
      });

      try {
        const response = await fetch(endpoint, {
          method,
          headers: isBulkDownload ? { 'Content-Type': 'application/json' } : undefined,
          body,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFileName || `download_${formatTimestampForFilename()}${isBulkDownload ? '.zip' : ''}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (showToast) {
          downloadToast && toast.dismiss(downloadToast.id);
          toast({
            title: "Download Complete",
            description: isBulkDownload
              ? `${fileIds.length} files have been downloaded successfully.`
              : "File downloaded successfully",
            duration: 3000,
          });
        }

        onDownloadComplete?.();
        return true;
      } catch (error) {
        if (showToast) {
          downloadToast && toast.dismiss(downloadToast.id);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to download files",
            variant: "destructive",
            duration: 3000,
          });
        }
        onDownloadError?.(error instanceof Error ? error : new Error('Download failed'));
        throw error;
      }
    },
  });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => downloadMutation.mutate()}
      disabled={downloadMutation.isPending || fileIds.length === 0}
      className="gap-2"
    >
      {downloadMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon && (
        customIcon || <Download className="h-4 w-4" />
      )}
      {text}
    </Button>
  );
};

// Playground component to showcase different variants
export const DownloadButtonPlayground = () => {
  const [showToast, setShowToast] = React.useState(true);
  const [showIcon, setShowIcon] = React.useState(true);
  const [isBulkDownload, setIsBulkDownload] = React.useState(false);

  // Mock file IDs for demonstration
  const singleFileId = ['mock-file-1'];
  const multipleFileIds = ['mock-file-1', 'mock-file-2', 'mock-file-3'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-toast" 
            checked={showToast} 
            onCheckedChange={setShowToast}
          />
          <Label htmlFor="show-toast">Show Toast Notifications</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-icon" 
            checked={showIcon} 
            onCheckedChange={setShowIcon}
          />
          <Label htmlFor="show-icon">Show Icon</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="bulk-download" 
            checked={isBulkDownload} 
            onCheckedChange={setIsBulkDownload}
          />
          <Label htmlFor="bulk-download">Bulk Download Mode</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <Card className="p-4 space-y-4">
          <h3 className="text-lg font-semibold">Default Variants</h3>
          <div className="space-y-2">
            <DownloadButton
              fileIds={isBulkDownload ? multipleFileIds : singleFileId}
              showToast={showToast}
              showIcon={showIcon}
              isBulkDownload={isBulkDownload}
            />
            <DownloadButton
              fileIds={isBulkDownload ? multipleFileIds : singleFileId}
              variant="secondary"
              showToast={showToast}
              showIcon={showIcon}
              isBulkDownload={isBulkDownload}
            />
            <DownloadButton
              fileIds={isBulkDownload ? multipleFileIds : singleFileId}
              variant="outline"
              showToast={showToast}
              showIcon={showIcon}
              isBulkDownload={isBulkDownload}
            />
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h3 className="text-lg font-semibold">Size Variants</h3>
          <div className="space-y-2">
            <DownloadButton
              fileIds={isBulkDownload ? multipleFileIds : singleFileId}
              size="sm"
              showToast={showToast}
              showIcon={showIcon}
              isBulkDownload={isBulkDownload}
            />
            <DownloadButton
              fileIds={isBulkDownload ? multipleFileIds : singleFileId}
              size="default"
              showToast={showToast}
              showIcon={showIcon}
              isBulkDownload={isBulkDownload}
            />
            <DownloadButton
              fileIds={isBulkDownload ? multipleFileIds : singleFileId}
              size="lg"
              showToast={showToast}
              showIcon={showIcon}
              isBulkDownload={isBulkDownload}
            />
            <DownloadButton
              fileIds={isBulkDownload ? multipleFileIds : singleFileId}
              size="icon"
              showToast={showToast}
              showIcon={true}
              text=""
              isBulkDownload={isBulkDownload}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DownloadButtonPlayground;
