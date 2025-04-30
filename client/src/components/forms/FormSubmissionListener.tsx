import React, { useEffect, useState } from 'react';
import { useFormSubmissionEvents } from '@/hooks/use-form-submission-events';
import { useToast } from '@/hooks/use-toast';

interface FormSubmissionListenerProps {
  /** Optional task ID to filter events for a specific task */
  taskId?: number;
  
  /** Optional company ID to filter events for a specific company */
  companyId?: number;
  
  /** Whether to show toast notifications for events */
  showToasts?: boolean;
  
  /** Child components to render */
  children?: React.ReactNode;
}

/**
 * FormSubmissionListener Component
 * 
 * This component listens for form submission events via WebSocket and
 * can trigger callbacks or display toast notifications when events occur.
 * 
 * You can place this component near the root of your application to handle
 * global form submission events, or within specific pages to handle
 * localized events.
 * 
 * @example
 * ```tsx
 * // Global listener with toasts
 * <FormSubmissionListener showToasts={true}>
 *   <App />
 * </FormSubmissionListener>
 * 
 * // Task-specific listener
 * <FormSubmissionListener taskId={123}>
 *   <TaskPage />
 * </FormSubmissionListener>
 * ```
 */
export function FormSubmissionListener({
  taskId,
  companyId,
  showToasts = false,
  children
}: FormSubmissionListenerProps) {
  const { toast } = useToast();
  const [unlockedTabs, setUnlockedTabs] = useState<string[]>([]);
  const [unlockedTasks, setUnlockedTasks] = useState<number[]>([]);
  
  const { lastFormSubmission } = useFormSubmissionEvents({
    onFormSubmitted: (eventTaskId, formType, status, data) => {
      // Only process events for the specified task ID if provided
      if (taskId && eventTaskId !== taskId) {
        return;
      }
      
      // Only process events for the specified company ID if provided
      if (companyId && data.companyId !== companyId) {
        return;
      }
      
      console.log(`[FormSubmissionListener] Form submitted: Task #${eventTaskId}, Type: ${formType}, Status: ${status}`);
      
      if (showToasts) {
        toast({
          title: 'Form Submitted',
          description: `Task #${eventTaskId} (${formType}) has been successfully submitted!`,
          variant: 'default',
        });
      }
    },
    
    onFileVaultUnlocked: (eventCompanyId, eventTaskId) => {
      // Only process events for the specified company ID if provided
      if (companyId && eventCompanyId !== companyId) {
        return;
      }
      
      // Only process events for the specified task ID if provided
      if (taskId && eventTaskId !== taskId) {
        return;
      }
      
      console.log(`[FormSubmissionListener] File Vault unlocked for company #${eventCompanyId} by task #${eventTaskId}`);
    },
    
    onDependentTasksUnlocked: (eventTaskIds, triggerTaskId) => {
      // Only process events for the specified task ID if provided
      if (taskId && triggerTaskId !== taskId) {
        return;
      }
      
      console.log(`[FormSubmissionListener] ${eventTaskIds.length} tasks unlocked by task #${triggerTaskId}: ${eventTaskIds.join(', ')}`);
      
      // Update state with the newly unlocked tasks
      setUnlockedTasks(prev => [...prev, ...eventTaskIds]);
    },
    
    onCompanyTabsUnlocked: (eventCompanyId, tabs) => {
      // Only process events for the specified company ID if provided
      if (companyId && eventCompanyId !== companyId) {
        return;
      }
      
      console.log(`[FormSubmissionListener] Tabs unlocked for company #${eventCompanyId}: ${tabs.join(', ')}`);
      
      // Update state with the newly unlocked tabs
      setUnlockedTabs(prev => [...prev, ...tabs]);
    }
  }, showToasts);
  
  // For debugging purposes
  useEffect(() => {
    if (unlockedTabs.length > 0) {
      console.log(`[FormSubmissionListener] Unlocked tabs: ${unlockedTabs.join(', ')}`);
    }
    
    if (unlockedTasks.length > 0) {
      console.log(`[FormSubmissionListener] Unlocked tasks: ${unlockedTasks.join(', ')}`);
    }
  }, [unlockedTabs, unlockedTasks]);
  
  return (
    <>
      {children}
    </>
  );
}

export default FormSubmissionListener;