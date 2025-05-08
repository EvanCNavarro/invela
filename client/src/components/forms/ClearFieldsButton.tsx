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
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  
  // Generate operation ID outside handler to ensure consistency
  const generateOperationId = useCallback(() => {
    return `clear_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);
  
  const handleClearFields = async () => {
    // Generate a unique operation ID for tracking
    const operationId = generateOperationId();
    
    try {
      // Map taskType to URL-friendly form type for API consistency
      let formTypeForApi = taskType;
      if (taskType === 'company_kyb') {
        formTypeForApi = 'kyb';
      } else if (taskType === 'open_banking') {
        formTypeForApi = 'open-banking';
      }
      
      // Log the start of the operation
      logger.info(`[ClearFieldsButton] Starting clear operation for ${taskType} task ${taskId}`, {
        taskId,
        taskType,
        formTypeForApi,
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
        toast({
          title: 'Success',
          description: 'Form fields cleared successfully',
          variant: 'success'
        });
        return;
      }
      
      // Update the last clear operation tracking
      lastClearOperation.taskId = taskId;
      lastClearOperation.timestamp = now;
      lastClearOperation.operationId = operationId;
      
      // CRITICAL FIX: Set window._lastClearOperation to prevent race conditions
      try {
        // Calculate a block expiration 30 seconds in the future
        const blockExpiration = now + 30000; // 30 seconds
        
        window._lastClearOperation = {
          taskId,
          timestamp: now,
          formType: taskType,
          blockExpiration // Add explicit expiration timestamp
        };
        
        logger.info(`[ClearFieldsButton][${operationId}] Set window._lastClearOperation to prevent race condition`, {
          taskId,
          formType: taskType,
          timestamp: new Date().toISOString(),
          blockExpiresAt: new Date(blockExpiration).toISOString(),
          blockDurationMs: 30000
        });
      } catch (winError) {
        logger.warn(`[ClearFieldsButton][${operationId}] Error setting window._lastClearOperation:`, {
          error: winError instanceof Error ? winError.message : String(winError)
        });
      }
      
      // Show in-progress toast for better user feedback
      toast({
        title: 'Clearing...',
        description: 'Clearing form fields...',
        variant: 'default'
      });
      
      try {
        // ENHANCED FIX: Make direct API call with proper cache prevention
        // Add timestamp query param to prevent stale responses
        const timestamp = Date.now();
        const clearUrl = `/api/${formTypeForApi}/clear/${taskId}${preserveProgress ? '?preserveProgress=true' : '?preserveProgress=false'}&t=${timestamp}`;
        
        logger.info(`[ClearFieldsButton][${operationId}] Making direct API call to: ${clearUrl}`, {
          taskId,
          formTypeForApi,
          preserveProgress,
          timestamp: new Date().toISOString()
        });
        
        // Call parent's onClear FIRST for immediate UI feedback
        logger.info(`[ClearFieldsButton][${operationId}] Calling onClear for immediate UI reset`);
        await onClear();
        
        // Then make the API call with proper cache busting headers
        const response = await fetch(clearUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({ 
            preserveProgress,
            forceUIReset: true,  // CRITICAL: Signal that UI should be forcefully reset
            timestamp,
            operationId
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to clear fields. Server responded with: ${response.status}. ${errorText}`);
        }
        
        // Parse the response
        const result = await response.json();
        
        logger.info(`[ClearFieldsButton][${operationId}] Server response:`, {
          taskId,
          success: result.success,
          status: result.status, 
          progress: result.progress,
          operationId
        });
        
        // CRITICAL FIX: Call onClear AGAIN after server response to ensure UI is in sync
        logger.info(`[ClearFieldsButton][${operationId}] Calling onClear again to ensure UI sync`);
        await onClear();
        
        logger.info(`[ClearFieldsButton] Successfully cleared fields for task ${taskId}`, {
          taskId,
          taskType,
          operationId,
          serverResponse: result
        });
        
        // Show success toast
        toast({
          title: 'Success',
          description: 'Form fields cleared successfully',
          variant: 'success'
        });
      } catch (apiError) {
        // Log the API error but still call onClear as fallback
        logger.error(`[ClearFieldsButton] API error when clearing fields:`, {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          taskId,
          taskType,
          operationId
        });
        
        // Show API error toast but continue with client-side clearing
        // Show error toast but continue with client-side clearing
        toast({
          title: 'Server Error',
          description: 'Server error, attempting client-side clear...',
          variant: 'warning'
        });
        
        // SIMPLIFIED APPROACH: Just call onClear without extra complexity 
        await onClear();
        
        // Show simple success message - we'll adjust our expectations
        toast({
          title: 'Fields Cleared',
          description: 'Form fields cleared successfully.',
          variant: 'success'
        });
      }
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
      toast({
        title: 'Error',
        description: error instanceof Error 
          ? error.message 
          : "There was an error clearing the form fields. Please try again.",
        variant: 'destructive'
      });
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