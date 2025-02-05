import { FileItem } from "@/types/files";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricBoxProps {
  title: string;
  children: React.ReactNode;
}

interface MetricItemProps {
  label: string;
  value: React.ReactNode;
}

function MetricBox({ title, children }: MetricBoxProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">{title}</h3>
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        {children}
      </div>
    </div>
  );
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

interface FileDetailsProps {
  file: FileItem;
  onClose: () => void;
  onDownload: (id: string) => void;
}

export function FileDetails({ file, onClose, onDownload }: FileDetailsProps) {
  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const formatTimeWithZone = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* File Information */}
          <MetricBox title="File Information">
            <MetricItem label="Name" value={file.name} />
            <MetricItem label="Type" value={file.type} />
            <MetricItem label="Size" value={file.size} />
            <MetricItem label="Version" value={`v${(file.version || 1.0).toFixed(1)}`} />
            <MetricItem 
              label="Status" 
              value={
                <span className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium",
                  {
                    'bg-green-100 text-green-800': file.status === 'uploaded',
                    'bg-yellow-100 text-yellow-800': file.status === 'uploading',
                    'bg-red-100 text-red-800': file.status === 'deleted'
                  }
                )}>
                  {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                </span>
              } 
            />
          </MetricBox>

          {/* Usage Statistics */}
          <MetricBox title="Usage Statistics">
            <MetricItem label="Downloads" value={file.downloadCount || 0} />
            <MetricItem label="Last Accessed" value={formatDate(file.lastAccessed)} />
            <MetricItem label="Unique Viewers" value={file.uniqueViewers || 0} />
            <MetricItem label="Collaborators" value={file.collaboratorCount || 0} />
          </MetricBox>

          {/* Security & Compliance */}
          <MetricBox title="Security & Compliance">
            <MetricItem 
              label="Access Level" 
              value={
                <span className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium",
                  {
                    'bg-red-100 text-red-800': file.accessLevel === 'private',
                    'bg-yellow-100 text-yellow-800': file.accessLevel === 'restricted',
                    'bg-green-100 text-green-800': !file.accessLevel || file.accessLevel === 'public'
                  }
                )}>
                  {(file.accessLevel || 'public').charAt(0).toUpperCase() + 
                   (file.accessLevel || 'public').slice(1)}
                </span>
              }
            />
            <MetricItem 
              label="Encryption" 
              value={file.encryptionStatus ? 'Enabled' : 'Disabled'} 
            />
            <MetricItem 
              label="Classification" 
              value={file.classificationType || 'Unclassified'} 
            />
          </MetricBox>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onDownload(file.id)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </>
  );
}
