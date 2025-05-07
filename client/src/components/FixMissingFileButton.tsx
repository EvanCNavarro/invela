import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileWarning, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FixMissingFileButtonProps {
  taskId: number;
  onSuccess?: (fileId: number, fileName: string) => void;
}

export const FixMissingFileButton: React.FC<FixMissingFileButtonProps> = ({
  taskId,
  onSuccess
}) => {
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const { toast } = useToast();

  const handleFixMissingFile = async () => {
    if (isFixing || isFixed) return;
    
    setIsFixing(true);
    
    try {
      console.log(`[FixMissingFileButton] Attempting to fix missing file for task ${taskId}`);
      
      const response = await apiRequest(`/api/fix-missing-file/${taskId}`, {
        method: 'POST'
      });
      
      if (response.success) {
        console.log(`[FixMissingFileButton] Successfully fixed missing file`, response);
        
        setIsFixed(true);
        
        toast({
          title: "File Regenerated Successfully",
          description: "Your form file has been regenerated and is now available for download.",
          variant: "default",
        });
        
        // Call the onSuccess callback if provided
        if (onSuccess && response.fileId) {
          onSuccess(response.fileId, response.fileName || `task_${taskId}_form.csv`);
        }
      } else {
        console.error(`[FixMissingFileButton] Failed to fix missing file:`, response.error);
        
        toast({
          title: "Error Regenerating File",
          description: response.error || "Failed to regenerate file. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[FixMissingFileButton] Error fixing missing file:', error);
      
      toast({
        title: "Error Regenerating File",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button
      variant={isFixed ? "outline" : "secondary"}
      size="sm"
      disabled={isFixing || isFixed}
      onClick={handleFixMissingFile}
      className={`${isFixed ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800' : ''}`}
    >
      {isFixing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Regenerating File...
        </>
      ) : isFixed ? (
        <>
          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
          File Ready
        </>
      ) : (
        <>
          <FileWarning className="mr-2 h-4 w-4" />
          Fix Missing File
        </>
      )}
    </Button>
  );
};