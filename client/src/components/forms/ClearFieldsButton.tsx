import React, { useState, useCallback } from 'react';
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
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { showClearFieldsToast } from '@/hooks/use-unified-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('ClearFieldsButton');

// Track the last clear operation to prevent duplicates
const lastClearOperation = {
  taskId: 0,
  timestamp: 0,
  operationId: ''
};

interface ClearFieldsButtonProps {
  taskId: number;
  taskType: string;
  onClear: () => Promise<void>;
  className?: string;
  preserveProgress?: boolean; // For KY3P editing mode
  isFormEditing?: boolean;
}

/**
 * An enhanced reusable button component for clearing form fields
 * with confirmation dialog, loading state, and operation tracking.
 */
export function ClearFieldsButton({ 
  taskId, 
  taskType, 
  onClear,
  className = '',
  preserveProgress = false,
  isFormEditing = false
}: ClearFieldsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Generate operation ID outside handler to ensure consistency
  const generateOperationId = useCallback(() => {
    return `clear_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);
  
  const handleClearFields = async () => {
    // Generate a unique operation ID for tracking
    const operationId = generateOperationId();
    
    try {
      // Log the start of the operation
      logger.info(`[ClearFieldsButton] Starting clear operation for ${taskType} task ${taskId}`, {
        taskId,
        taskType,
        operationId,
        preserveProgress,
        isFormEditing,
        timestamp: new Date().toISOString()
      });
      
      // Close dialog and show loading state
      setIsOpen(false);
      setIsClearing(true);
      
      // Prevent duplicate operations within a short time window
      const now = Date.now();
      // Debounce within 3 seconds and same task
      if (lastClearOperation.taskId === taskId && now - lastClearOperation.timestamp < 3000) {
        logger.warn(`[ClearFieldsButton] Debouncing duplicate clear operation for task ${taskId}`, {
          taskId,
          operationId,
          lastOperationId: lastClearOperation.operationId,
          timeSinceLastClear: now - lastClearOperation.timestamp
        });
        
        // No need to actually clear again, just act like we did
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UI feedback
        setIsClearing(false);
        
        // Show success toast even though we debounced
        showClearFieldsToast('success', 'Form fields cleared successfully', {
          operationId,
          wasDebounced: true
        });
        return;
      }
      
      // Update the last clear operation tracking
      lastClearOperation.taskId = taskId;
      lastClearOperation.timestamp = now;
      lastClearOperation.operationId = operationId;
      
      // Show in-progress toast for better user feedback
      showClearFieldsToast('loading', 'Clearing form fields...', { 
        operationId, 
        taskId, 
        taskType 
      });
      
      // Call parent's onClear function
      const startTime = Date.now();
      await onClear();
      const duration = Date.now() - startTime;
      
      logger.info(`[ClearFieldsButton] Successfully cleared fields for task ${taskId} in ${duration}ms`, {
        taskId,
        taskType,
        operationId,
        durationMs: duration
      });
      
      // Show success toast using the unified toast system
      showClearFieldsToast('success', 'Form fields cleared successfully', { 
        operationId, 
        taskId, 
        taskType,
        durationMs: duration
      });
    } catch (error) {
      // Log error with detailed information
      logger.error(`[ClearFieldsButton] Error clearing fields for task ${taskId}:`, error, {
        taskId,
        taskType,
        operationId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'UnknownError'
      });
      
      // Show error toast with helpful message
      showClearFieldsToast(
        'error', 
        error instanceof Error 
          ? error.message 
          : "There was an error clearing the form fields. Please try again.",
        { operationId, taskId, taskType }
      );
    } finally {
      // Always reset the clearing state
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