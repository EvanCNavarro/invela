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
      
      // Map taskType to URL-friendly form type for API consistency
      let formTypeForApi = taskType;
      if (taskType === 'company_kyb') {
        formTypeForApi = 'kyb';
      } else if (taskType === 'open_banking') {
        formTypeForApi = 'open-banking';
      }
      
      // Show in-progress toast
      toast({
        title: 'Clearing...',
        description: 'Clearing form fields...',
        variant: 'default'
      });
      
      // SIMPLE APPROACH: Make a direct API call to clear fields
      const clearUrl = `/api/${formTypeForApi}/clear/${taskId}${preserveProgress ? '?preserveProgress=true' : ''}`;
      
      logger.info(`[ClearFields] Calling API to clear fields: ${clearUrl}`, {
        taskId,
        formType: taskType,
        operationId
      });
      
      const response = await fetch(clearUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          preserveProgress,
          resetUI: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }
      
      // SIMPLIFICATION: Force remove relevant queries from cache
      const keysToRemove = [
        `/api/tasks/${taskId}`,
        `/api/${formTypeForApi}/progress/${taskId}`,
        `/api/${formTypeForApi.replace('-', '_')}/progress/${taskId}`,
        `/api/kyb/progress/${taskId}`,
        `/api/ky3p/progress/${taskId}`,
        `/api/open-banking/progress/${taskId}`
      ];
      
      logger.info(`[ClearFields] Removing queries from cache`, {
        keys: keysToRemove,
        operationId
      });
      
      // Remove cache entries
      for (const key of keysToRemove) {
        queryClient.removeQueries({ queryKey: [key] });
      }
      
      // Call the onClear callback to reset form state
      await onClear();
      
      // Success toast
      toast({
        title: 'Success',
        description: 'Form fields cleared successfully',
        variant: 'success'
      });
      
      // SIMPLIFICATION: Force a redirect to the same page to get fresh data
      // This is the most reliable way to ensure everything is reset
      setTimeout(() => {
        const currentUrl = window.location.pathname;
        logger.info(`[ClearFields] Redirecting to refresh page: ${currentUrl}`);
        
        // Navigate to the same page to force a full re-render and data refetch
        navigate(currentUrl);
      }, 300);
      
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