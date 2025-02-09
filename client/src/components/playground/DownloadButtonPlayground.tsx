import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMutation } from '@tanstack/react-query';

interface DownloadButtonProps {
  // Core props
  onDownloadComplete?: () => void;
  onDownloadError?: (error: Error) => void;

  // Display customization
  showIcon?: boolean;
  showText?: boolean;

  // Behavior customization
  useRealDownload?: boolean;
}

const formatTimestampForFilename = () => {
  const now = new Date();
  return now.toISOString().split('.')[0].replace(/[:]/g, '-');
};

export const DownloadButton = ({
  onDownloadComplete,
  onDownloadError,
  showIcon = true,
  showText = true,
  useRealDownload = false,
}: DownloadButtonProps) => {
  const { toast } = useToast();

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const downloadToast = toast({
        title: "Preparing Download",
        description: (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing download...</span>
          </div>
        ),
        duration: 0,
      });

      try {
        if (useRealDownload) {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Create a sample text file
          const content = "Sample file content";
          const blob = new Blob([content], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `INVL_DOC_${formatTimestampForFilename()}.txt`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }

        if (downloadToast) {
          toast.dismiss(downloadToast.id);
          toast({
            title: "Download Complete",
            description: "File downloaded successfully",
            duration: 3000,
          });
        }

        onDownloadComplete?.();
        return true;
      } catch (error) {
        if (downloadToast) {
          toast.dismiss(downloadToast.id);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to download file",
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
      variant="outline"
      size="default"
      onClick={() => downloadMutation.mutate()}
      disabled={downloadMutation.isPending}
      className="gap-2"
    >
      {downloadMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon && (
        <Download className="h-4 w-4" />
      )}
      {showText && "Download"}
    </Button>
  );
};

// Playground component to showcase different display modes
export const DownloadButtonPlayground = () => {
  const [displayMode, setDisplayMode] = React.useState("both"); // "both", "icon", "text"
  const [useRealDownload, setUseRealDownload] = React.useState(false);

  const getButtonProps = () => {
    switch (displayMode) {
      case "icon":
        return { showIcon: true, showText: false };
      case "text":
        return { showIcon: false, showText: true };
      default:
        return { showIcon: true, showText: true };
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Display Mode</Label>
          <ToggleGroup type="single" value={displayMode} onValueChange={(value) => value && setDisplayMode(value)}>
            <ToggleGroupItem value="both" aria-label="Both icon and text">
              Icon & Text
            </ToggleGroupItem>
            <ToggleGroupItem value="icon" aria-label="Icon only">
              Icon Only
            </ToggleGroupItem>
            <ToggleGroupItem value="text" aria-label="Text only">
              Text Only
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="real-download" 
            checked={useRealDownload} 
            onCheckedChange={setUseRealDownload}
          />
          <Label htmlFor="real-download">Enable Real File Download</Label>
        </div>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <DownloadButton 
            useRealDownload={useRealDownload}
            {...getButtonProps()}
          />
        </div>
      </Card>
    </div>
  );
};

export default DownloadButtonPlayground;