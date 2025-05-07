/**
 * Fix Missing File Button Component
 * 
 * This component provides a UI for checking and repairing missing files.
 * It integrates with the fix-missing-file API to diagnose issues and regenerate
 * files when needed.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Separator } from '@/components/ui/separator';
import getLogger from '@/utils/logger';

const logger = getLogger('FixMissingFileButton');

interface FileRepairState {
  isChecking: boolean;
  isReparing: boolean;
  needsRepair: boolean;
  fileExists: boolean;
  hasReference: boolean;
  checkCompleted: boolean;
  repairCompleted: boolean;
  fileId?: number;
  taskType?: string;
  error?: string;
  details?: string;
}

interface FixMissingFileButtonProps {
  taskId: number;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | null;
  className?: string;
  onFileRepaired?: (fileId: number) => void;
  showAlways?: boolean;
  buttonText?: string;
}

/**
 * Button component that allows users to fix missing form files
 */
export const FixMissingFileButton: React.FC<FixMissingFileButtonProps> = ({
  taskId,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className = '',
  onFileRepaired,
  showAlways = false,
  buttonText = 'Fix Missing File',
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [repairState, setRepairState] = useState<FileRepairState>({
    isChecking: false,
    isReparing: false,
    needsRepair: false,
    fileExists: false,
    hasReference: false,
    checkCompleted: false,
    repairCompleted: false
  });
  
  /**
   * Check the file status
   */
  const checkFileStatus = async () => {
    setRepairState(prev => ({ ...prev, isChecking: true, error: undefined }));
    
    try {
      // Fetch the file status from the API
      const response = await fetch(`/api/fix-missing-file/${taskId}/check`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      logger.info('File status check result:', data);
      
      if (data.success) {
        setRepairState(prev => ({
          ...prev,
          isChecking: false,
          checkCompleted: true,
          needsRepair: data.needsRepair,
          hasReference: data.verificationResult?.hasReference || false,
          fileExists: data.verificationResult?.fileExists || false, 
          fileId: data.verificationResult?.fileId,
          taskType: data.taskType,
          details: data.verificationResult?.details
        }));
      } else {
        setRepairState(prev => ({
          ...prev,
          isChecking: false,
          checkCompleted: true,
          error: data.error || 'Unknown error checking file status'
        }));
      }
    } catch (error) {
      logger.error('Error checking file status:', error);
      
      setRepairState(prev => ({
        ...prev,
        isChecking: false,
        checkCompleted: true,
        error: error instanceof Error ? error.message : 'Unknown error checking file status'
      }));
    }
  };
  
  /**
   * Repair the missing file
   */
  const repairFile = async () => {
    setRepairState(prev => ({ ...prev, isReparing: true, error: undefined }));
    
    try {
      // Call the API to repair the file
      const response = await fetch(`/api/fix-missing-file/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      logger.info('File repair result:', data);
      
      if (data.success) {
        // Update the state with repair results
        setRepairState(prev => ({
          ...prev,
          isReparing: false,
          repairCompleted: true,
          needsRepair: false,
          fileExists: true,
          hasReference: true,
          fileId: data.fileId
        }));
        
        // Notify parent component of successful repair if callback exists
        if (onFileRepaired && data.fileId) {
          onFileRepaired(data.fileId);
        }
        
        toast({
          title: "File Regenerated",
          description: "The form file was successfully regenerated. You can now download it.",
          variant: "default",
        });
      } else {
        setRepairState(prev => ({
          ...prev,
          isReparing: false,
          repairCompleted: true,
          error: data.error || 'Unknown error repairing file'
        }));
        
        toast({
          title: "File Repair Failed",
          description: data.error || "Could not regenerate the form file. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error repairing file:', error);
      
      setRepairState(prev => ({
        ...prev,
        isReparing: false,
        repairCompleted: true,
        error: error instanceof Error ? error.message : 'Unknown error repairing file'
      }));
      
      toast({
        title: "File Repair Failed",
        description: "Could not connect to the server. Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  /**
   * Reset the repair state and close the dialog
   */
  const resetAndClose = () => {
    setRepairState({
      isChecking: false,
      isReparing: false,
      needsRepair: false,
      fileExists: false,
      hasReference: false,
      checkCompleted: false,
      repairCompleted: false
    });
    setDialogOpen(false);
  };
  
  /**
   * Handle dialog open
   */
  const handleDialogOpen = (isOpen: boolean) => {
    setDialogOpen(isOpen);
    
    // Automatically start checking when dialog opens
    if (isOpen && !repairState.checkCompleted) {
      checkFileStatus();
    }
    
    // Reset state when dialog closes
    if (!isOpen && repairState.checkCompleted) {
      // Wait for animation to complete
      setTimeout(() => {
        resetAndClose();
      }, 300);
    }
  };
  
  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={className}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check and Repair Form File</DialogTitle>
          <DialogDescription>
            This tool will check if the form file exists and allows you to regenerate it if needed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* File Check Section */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                File Status Check
              </CardTitle>
              <CardDescription>
                Checking if the form file exists and is correctly linked
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repairState.isChecking ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  <span className="ml-2">Checking file status...</span>
                </div>
              ) : repairState.error && !repairState.checkCompleted ? (
                <div className="flex items-center text-red-500 py-3">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span>Error: {repairState.error}</span>
                </div>
              ) : repairState.checkCompleted ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">File reference exists:</span>
                    <Badge variant={repairState.hasReference ? "outline" : "destructive"}>
                      {repairState.hasReference ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">File exists in database:</span>
                    <Badge variant={repairState.fileExists ? "outline" : "destructive"}>
                      {repairState.fileExists ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Needs repair:</span>
                    <Badge variant={repairState.needsRepair ? "destructive" : "outline"}>
                      {repairState.needsRepair ? "Yes" : "No"}
                    </Badge>
                  </div>
                  
                  {repairState.details && (
                    <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      {repairState.details}
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
          
          {/* Repair Section - Only show if check is completed and repair is needed */}
          {repairState.checkCompleted && repairState.needsRepair && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  File Repair
                </CardTitle>
                <CardDescription>
                  Regenerate the form file from saved form data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {repairState.isReparing ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <span className="ml-2">Regenerating form file...</span>
                  </div>
                ) : repairState.error && repairState.checkCompleted ? (
                  <div className="flex items-center text-red-500 py-3">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>Error: {repairState.error}</span>
                  </div>
                ) : repairState.repairCompleted ? (
                  <div className="flex items-center text-green-500 py-3">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    <span>File successfully regenerated!</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    The form file is missing or needs to be regenerated. Click the button below to fix it.
                  </p>
                )}
              </CardContent>
              {!repairState.repairCompleted && (
                <CardFooter className="pt-0">
                  <Button
                    onClick={repairFile}
                    disabled={repairState.isReparing}
                    className="w-full"
                  >
                    {repairState.isReparing && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Regenerate Form File
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}
          
          {/* Success Message - Show when repair is not needed or completed successfully */}
          {repairState.checkCompleted && (!repairState.needsRepair || repairState.repairCompleted) && !repairState.error && (
            <div className="rounded-md bg-green-50 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Form file is valid</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      The form file exists and is correctly linked to this task. You can download it using the download button.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={resetAndClose}>
            Close
          </Button>
          {repairState.checkCompleted && repairState.error && (
            <Button onClick={checkFileStatus} disabled={repairState.isChecking}>
              {repairState.isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Try Again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FixMissingFileButton;