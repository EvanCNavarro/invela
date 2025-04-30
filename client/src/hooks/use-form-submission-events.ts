import { useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';

export interface FormSubmissionEventCallbacks {
  /**
   * Called when a form submission event is received
   * 
   * @param taskId The task ID
   * @param formType The form type ('kyb', 'ky3p', 'open_banking')
   * @param status The new task status
   * @param data The complete submission data
   */
  onFormSubmitted?: (taskId: number, formType: string, status: string, data: any) => void;
  
  /**
   * Called when file vault is unlocked for a company
   * 
   * @param companyId The company ID
   * @param taskId The task ID that triggered the unlock
   */
  onFileVaultUnlocked?: (companyId: number, taskId: number) => void;
  
  /**
   * Called when additional tasks are unlocked as a result of submission
   * 
   * @param taskIds The IDs of newly unlocked tasks
   * @param triggerTaskId The ID of the task that triggered the unlock
   */
  onDependentTasksUnlocked?: (taskIds: number[], triggerTaskId: number) => void;
  
  /**
   * Called when specific company tabs are unlocked (like "File Vault", "Dashboard", "Insights")
   * 
   * @param companyId The company ID
   * @param tabs The list of newly unlocked tabs
   */
  onCompanyTabsUnlocked?: (companyId: number, tabs: string[]) => void;
}

/**
 * Hook for listening to and reacting to form submission events
 * 
 * @param callbacks Callback functions for different form submission events
 * @param showToasts Whether to show toast notifications for events (default: false)
 */
export function useFormSubmissionEvents(callbacks: FormSubmissionEventCallbacks, showToasts = false) {
  const { lastFormSubmission } = useWebSocket();
  const { toast } = useToast();
  
  useEffect(() => {
    // Return early if there is no form submission data
    if (!lastFormSubmission) {
      return;
    }
    
    const {
      taskId,
      formType,
      status,
      companyId,
      unlockedTabs,
      unlockedTasks,
    } = lastFormSubmission;
    
    // Trigger form submission callback
    if (callbacks.onFormSubmitted) {
      callbacks.onFormSubmitted(taskId, formType, status, lastFormSubmission);
    }
    
    // Trigger file vault unlock callback
    if (unlockedTabs?.includes('file-vault') && callbacks.onFileVaultUnlocked) {
      callbacks.onFileVaultUnlocked(companyId, taskId);
      
      if (showToasts) {
        toast({
          title: 'File Vault Unlocked',
          description: `File Vault has been unlocked for company #${companyId}`,
        });
      }
    }
    
    // Trigger dependent tasks unlock callback
    if (unlockedTasks?.length && callbacks.onDependentTasksUnlocked) {
      callbacks.onDependentTasksUnlocked(unlockedTasks, taskId);
      
      if (showToasts) {
        toast({
          title: 'Tasks Unlocked',
          description: `${unlockedTasks.length} dependent task(s) have been unlocked`,
        });
      }
    }
    
    // Trigger company tabs unlock callback
    if (unlockedTabs?.length && callbacks.onCompanyTabsUnlocked) {
      callbacks.onCompanyTabsUnlocked(companyId, unlockedTabs);
      
      if (showToasts) {
        const readableTabs = unlockedTabs.map(tab => {
          // Convert kebab-case to title case
          return tab
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        });
        
        toast({
          title: 'Company Features Unlocked',
          description: `New features unlocked: ${readableTabs.join(', ')}`,
        });
      }
    }
  }, [lastFormSubmission, callbacks, toast, showToasts]);
  
  return {
    lastFormSubmission,
  };
}

export default useFormSubmissionEvents;