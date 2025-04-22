import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

// KY3P form-specific auto-fill function
const handleKY3PAutoFill = async (
  taskId: number,
  form: any,
  resetForm: (() => void) | undefined,
  refreshStatus: (() => void) | undefined,
  onProgress: ((progress: number) => void) | undefined
): Promise<boolean> => {
  try {
    logger.info(`[UniversalForm] Using standalone direct API solution for KY3P task ${taskId}`);
    
    // Call the standalone endpoint
    const response = await fetch(`/api/ky3p/apply-demo-data/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        toast({
          variant: "destructive",
          title: "Auto-Fill Restricted",
          description: "Auto-fill is only available for demo companies."
        });
        return false;
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to apply demo data');
    }
    
    const result = await response.json();
    
    logger.info(`[UniversalForm] KY3P direct API response:`, {
      success: result.success,
      fieldsProcessed: result.successCount,
      progress: result.progress
    });
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to apply demo data');
    }
    
    // Reset the form first to clear existing fields
    if (resetForm) {
      resetForm();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Update form UI with the values from the response
    const demoData = result.data || {};
    for (const [key, value] of Object.entries(demoData)) {
      if (value !== null && value !== undefined) {
        form.setValue(key, value, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
      }
    }
    
    // Invalidate queries to refresh UI
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/ky3p/progress'] });
    
    // Show success toast
    toast({
      title: "Auto-Fill Complete",
      description: `Applied demo data to ${result.successCount} fields`,
      duration: 3000,
    });
    
    // Refresh status
    if (refreshStatus) {
      refreshStatus();
    }
    
    // Update progress indicator
    if (onProgress) {
      onProgress(100);
    }
    
    return true;
  } catch (error) {
    logger.error(`[UniversalForm] KY3P standalone demo fill failed:`, error);
    toast({
      variant: "destructive",
      title: "Auto-Fill Failed",
      description: error instanceof Error ? error.message : "Failed to auto-fill form",
    });
    return false;
  }
};

// Usage of the function above in UniversalForm component
export function UniversalFormDemo() {
  const [demoFillLoading, setDemoFillLoading] = useState(false);
  const form = useForm();
  
  const taskId = 123; // This would come from props in the real component
  const taskType = 'sp_ky3p_assessment'; // This would come from props
  
  const resetForm = () => {
    form.reset();
  };
  
  const refreshStatus = () => {
    // This would refresh the task status in the real component
    console.log('Refreshing status...');
  };
  
  const onProgress = (progress: number) => {
    // This would update the progress indicator in the real component
    console.log(`Progress: ${progress}%`);
  };
  
  const handleDemoAutoFill = useCallback(async () => {
    if (!taskId) {
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: "No task ID available for auto-fill",
      });
      return false;
    }
    
    setDemoFillLoading(true);
    
    try {
      logger.info(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
      
      // Show loading toast
      toast({
        title: "Auto-Fill In Progress",
        description: "Loading demo data...",
        duration: 3000,
      });
      
      // Special handling for KY3P forms using completely standalone approach
      if (taskType === 'sp_ky3p_assessment') {
        const result = await handleKY3PAutoFill(
          taskId,
          form,
          resetForm,
          refreshStatus,
          onProgress
        );
        
        setDemoFillLoading(false);
        return result;
      }
      
      // For all other form types, other processing would go here
      
      setDemoFillLoading(false);
      return true;
    } catch (error) {
      logger.error('[UniversalForm] Auto-fill error:', error);
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: error instanceof Error ? error.message : "There was an error loading demo data",
      });
      setDemoFillLoading(false);
      return false;
    }
  }, [taskId, taskType, form]);
  
  return (
    <div>
      <h1>Universal Form Demo</h1>
      <button 
        onClick={() => handleDemoAutoFill()}
        disabled={demoFillLoading}
      >
        {demoFillLoading ? 'Loading...' : 'Auto-Fill Form'}
      </button>
    </div>
  );
}