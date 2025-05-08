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
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

const logger = getLogger('ClearFieldsButton');

// Simple tracking to prevent spamming the button
let lastClearTime = 0;

interface ClearFieldsButtonProps {
  taskId: number;
  taskType: string;
  onClear: () => Promise<void>;
  className?: string;
  preserveProgress?: boolean; // For KY3P editing mode
  isFormEditing?: boolean;
}

// Interface for the response from enhancedClearFields
interface ClearFieldsResult {
  success: boolean;
  message: string;
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
  
  // Add hooks for navigation and query cache management
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const handleClearFields = async () => {
    // Simple tracking ID for logs
    const operationId = generateOperationId();
    
    try {
      // Close dialog and show loading state
      setIsOpen(false);
      setIsClearing(true);
      
      // Show in-progress toast
      toast({
        title: 'Clearing...',
        description: 'Clearing form fields...',
        variant: 'default'
      });
      
      // Import and use the enhanced clear fields functionality
      const { enhancedClearFields, shouldBlockClearOperation, broadcastClearFields } = await import('./enhancedClearFields');
      
      // Check if we should block this operation due to recent clear
      if (shouldBlockClearOperation(taskId, taskType)) {
        logger.info(`[ClearFields] Blocking clear operation due to recent clear`, {
          taskId,
          formType: taskType,
          operationId
        });
        
        toast({
          title: 'Already Cleared',
          description: 'Form fields were just cleared. Please wait a moment before trying again.',
          variant: 'info'
        });
        
        setIsClearing(false);
        return;
      }
      
      // Use the enhanced clear fields functionality
      logger.info(`[ClearFields] Using enhanced clear fields approach`, {
        taskId,
        formType: taskType,
        operationId,
        preserveProgress
      });
      
      await enhancedClearFields(taskId, taskType, queryClient, {
        preserveProgress,
        resetUI: true,
        clearSections: true
      });
      
      // Also broadcast the clear operation to all connected clients
      logger.info(`[ClearFields] Broadcasting clear operation to all connected clients`, {
        taskId,
        formType: taskType,
        operationId
      });
      
      // Don't await this to avoid blocking UI
      broadcastClearFields(taskId, taskType, {
        preserveProgress,
        resetUI: true,
        clearSections: true
      }).catch(err => {
        // Non-critical error, just log it
        logger.warn(`[ClearFields] Error broadcasting clear operation:`, err);
      });
      
      // Reset form UI state completely
      // Call the parent component's onClear to reset the form
      logger.info(`[ClearFields] Resetting form UI state`, {
        operationId
      });
      
      await onClear();
      
      // Success toast
      toast({
        title: 'Success',
        description: 'Form fields cleared successfully',
        variant: 'success'
      });
      
    } catch (error) {
      // Log error
      logger.error(`[ClearFields] Error clearing fields:`, error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clear fields',
        variant: 'destructive'
      });
    } finally {
      // Reset clearing state
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