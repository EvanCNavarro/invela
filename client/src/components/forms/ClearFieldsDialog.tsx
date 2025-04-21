import React, { useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface ClearFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: number;
  taskType: string;
  onClearFields: () => Promise<void>;
}

/**
 * A dialog component to confirm clearing all fields in a form
 */
export function ClearFieldsDialog({
  open,
  onOpenChange,
  taskId,
  taskType,
  onClearFields,
}: ClearFieldsDialogProps) {
  const handleClearFields = useCallback(async () => {
    try {
      toast({
        title: "Clearing Fields",
        description: "Removing all entered data...",
        duration: 3000,
      });
      
      // Close the dialog immediately
      onOpenChange(false);
      
      // Execute the clear fields action - this will be implemented in the parent component
      await onClearFields();
      
      // Show success toast
      toast({
        title: "Fields Cleared",
        description: "All form fields have been cleared successfully.",
        variant: "success",
      });
    } catch (error) {
      logger.error('[ClearFieldsDialog] Error clearing fields:', error);
      toast({
        title: "Clear Fields Failed",
        description: error instanceof Error ? error.message : "Failed to clear the form fields",
        variant: "destructive",
      });
    }
  }, [onClearFields, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear All Fields?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all data you've entered so far. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClearFields} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Clear All Fields
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}