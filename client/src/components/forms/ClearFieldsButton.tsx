import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { showClearFieldsToast } from '@/hooks/use-unified-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('ClearFieldsButton');

// Track the last clear operation to prevent duplicates
const lastClearOperation = {
  taskId: 0,
  timestamp: 0
};

interface ClearFieldsButtonProps {
  taskId: number;
  taskType: string;
  onClear: () => Promise<void>;
  className?: string;
}

/**
 * A reusable button component for clearing form fields
 * with confirmation dialog and loading state.
 */
export function ClearFieldsButton({ 
  taskId, 
  taskType, 
  onClear,
  className = ''
}: ClearFieldsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const handleClearFields = async () => {
    try {
      // Close dialog and show loading state
      setIsOpen(false);
      setIsClearing(true);
      
      // Prevent duplicate operations within a short time window
      const now = Date.now();
      // Debounce within 3 seconds and same task
      if (lastClearOperation.taskId === taskId && now - lastClearOperation.timestamp < 3000) {
        logger.warn(`[ClearFieldsButton] Debouncing duplicate clear operation for task ${taskId}`);
        // No need to actually clear again, just act like we did
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UI feedback
        setIsClearing(false);
        return;
      }
      
      // Update the last clear operation
      lastClearOperation.taskId = taskId;
      lastClearOperation.timestamp = now;
      
      // Call parent's onClear function
      await onClear();
      
      // Show success toast using the unified toast system
      showClearFieldsToast('success');
    } catch (error) {
      logger.error('[ClearFieldsButton] Error clearing fields:', error);
      showClearFieldsToast('error', error instanceof Error ? error.message : "There was an error clearing the form fields");
    } finally {
      setIsClearing(false);
    }
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        disabled={isClearing}
        className={`bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 justify-center w-[170px] whitespace-nowrap ${className}`}
      >
        {isClearing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Clearing...
          </>
        ) : (
          <>
            <Eraser className="mr-2 h-4 w-4" />
            Clear Fields
          </>
        )}
      </Button>
      
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Fields</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all fields? This action cannot be undone 
              and all information entered in this form will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearFields}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Clear Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}