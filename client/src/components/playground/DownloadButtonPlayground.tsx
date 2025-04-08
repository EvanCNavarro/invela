import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast, Toast } from '@/hooks/use-toast';
import { useUnifiedToast } from '@/hooks/use-unified-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UnifiedDropdown } from '@/components/ui/unified-dropdown';
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
  const unifiedToast = useUnifiedToast();

  const downloadMutation = useMutation({
    mutationFn: async () => {
      // Using the standard toast for the loading state since it has a spinner
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
          // Dismiss using the toast returned object
          downloadToast.dismiss();
          // Use the unified toast system for success message
          unifiedToast.success("Download Complete", "File downloaded successfully");
        }

        onDownloadComplete?.();
        return true;
      } catch (error) {
        if (downloadToast) {
          // Dismiss using the toast returned object
          downloadToast.dismiss();
          // Use the unified toast system for error message
          unifiedToast.error(
            "Download Failed", 
            error instanceof Error ? error.message : "Failed to download file"
          );
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
  const [useRealDownload, setUseRealDownload] = React.useState(true);

  const displayItems = [
    { 
      id: 'both', 
      label: 'Icon & Text',
      selected: displayMode === 'both',
      onClick: () => setDisplayMode('both')
    },
    { 
      id: 'icon', 
      label: 'Icon Only',
      selected: displayMode === 'icon',
      onClick: () => setDisplayMode('icon')
    },
    { 
      id: 'text', 
      label: 'Text Only',
      selected: displayMode === 'text',
      onClick: () => setDisplayMode('text')
    }
  ];

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
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="real-download"
            checked={useRealDownload}
            onCheckedChange={setUseRealDownload}
          />
          <Label htmlFor="real-download">Enable File</Label>
        </div>

        <UnifiedDropdown
          trigger={{
            text: displayItems.find(item => item.selected)?.label || "Select Display Mode",
            variant: 'default'
          }}
          items={displayItems}
          multiSelect={false}
          showCheckmarks={true}
        />
      </div>

      <div className="space-y-4">
        <DownloadButton
          useRealDownload={useRealDownload}
          {...getButtonProps()}
        />
      </div>
    </div>
  );
};

export default DownloadButtonPlayground;