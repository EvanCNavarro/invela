/**
 * Enhanced universal demo auto-fill handler that works for all form types
 * 
 * This function uses the universal demo auto-fill endpoint first,
 * and if that fails, falls back to the legacy endpoints for specific form types.
 * 
 * It uses an improved approach for applying form data to ensure proper
 * field registration and rendering.
 */

import { toast } from '@/hooks/use-toast';
import { FormServiceInterface } from '../../services/formService';
import { applyAndVerifyFormData } from './updateDemoFormUtils';

interface DemoAutoFillOptions {
  taskId?: number;
  taskType: string;
  form: any;
  resetForm: (data: Record<string, any>) => void;
  updateField: (fieldKey: string, value: any) => Promise<void>;
  refreshStatus: () => Promise<void>;
  saveProgress: () => Promise<void>;
  onProgress?: (progress: number) => void;
  formService: FormServiceInterface | null;
  setForceRerender: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Enhanced universal demo auto-fill handler that works for all form types
 * 
 * This function uses the universal demo auto-fill endpoint first,
 * and if that fails, falls back to the legacy endpoints for specific form types.
 * 
 * It uses an improved approach for applying form data to ensure proper
 * field registration and rendering.
 */
export async function handleDemoAutoFill({
  taskId,
  taskType,
  form,
  resetForm,
  updateField,
  refreshStatus,
  saveProgress,
  onProgress,
  formService,
  setForceRerender
}: DemoAutoFillOptions): Promise<void> {
  if (!taskId) {
    toast({
      title: 'Demo Auto-Fill Error',
      description: 'Cannot auto-fill without a task ID',
      variant: 'destructive',
    });
    return;
  }
  
  try {
    // Show loading toast
    toast({
      title: 'Demo Auto-Fill',
      description: 'Filling form with demo data...',
    });
    
    // First attempt: Use the unified endpoint (if available)
    try {
      console.log(`[Demo Auto-Fill] Attempting unified endpoint for task ${taskId}`);
      const unifiedResponse = await fetch(`/api/universal-demo-autofill/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType })
      });
      
      if (unifiedResponse.ok) {
        const data = await unifiedResponse.json();
        
        if (data.success && data.formData) {
          console.log(`[Demo Auto-Fill] Got ${Object.keys(data.formData).length} fields from unified endpoint`);
          
          // Apply the form data with verification
          const result = await applyAndVerifyFormData(data.formData, updateField, resetForm, form);
          
          if (result.success) {
            // Force a re-render to ensure form state is correctly displayed
            setForceRerender(prev => !prev);
            
            // Save progress and refresh status
            try {
              await saveProgress();
              await refreshStatus();
              if (onProgress) onProgress(50); // Set to 50% by default
            } catch (saveError) {
              console.error('[Demo Auto-Fill] Error saving progress:', saveError);
            }
            
            toast({
              title: 'Demo Auto-Fill Complete',
              description: `Successfully filled ${Object.keys(data.formData).length} fields with demo data`,
            });
            return;
          } else {
            console.warn('[Demo Auto-Fill] Verification failed, will try legacy endpoint as fallback');
          }
        }
      }
    } catch (unifiedError) {
      console.error('[Demo Auto-Fill] Error with unified endpoint:', unifiedError);
    }
    
    // Second attempt: Try the fixed demo-autofill endpoint
    try {
      console.log(`[Demo Auto-Fill] Attempting fixed endpoint for task ${taskId}`);
      const fixedResponse = await fetch(`/api/fix-demo-autofill/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType })
      });
      
      if (fixedResponse.ok) {
        const data = await fixedResponse.json();
        
        if (data.success && data.formData) {
          console.log(`[Demo Auto-Fill] Got ${Object.keys(data.formData).length} fields from fixed endpoint`);
          
          // Apply the form data with verification
          const result = await applyAndVerifyFormData(data.formData, updateField, resetForm, form);
          
          if (result.success) {
            // Force a re-render to ensure form state is correctly displayed
            setForceRerender(prev => !prev);
            
            // Save progress and refresh status
            try {
              await saveProgress();
              await refreshStatus();
              if (onProgress) onProgress(50); // Set to 50% by default
            } catch (saveError) {
              console.error('[Demo Auto-Fill] Error saving progress:', saveError);
            }
            
            toast({
              title: 'Demo Auto-Fill Complete',
              description: `Successfully filled ${Object.keys(data.formData).length} fields with demo data`,
            });
            return;
          } else {
            console.warn('[Demo Auto-Fill] Verification failed with fixed endpoint, falling back to legacy');
          }
        }
      }
    } catch (fixedError) {
      console.error('[Demo Auto-Fill] Error with fixed endpoint:', fixedError);
    }
    
    // Fallback: Try legacy demo-autofill specific to the form type
    await useLegacyEndpoint(taskId, taskType);
    
  } catch (error) {
    console.error('[Demo Auto-Fill] Error:', error);
    toast({
      title: 'Demo Auto-Fill Failed',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
  
  // This is the fallback function that uses the legacy endpoints based on form type
  async function useLegacyEndpoint(taskId: number, taskType: string): Promise<void> {
    try {
      console.log(`[Demo Auto-Fill] Using legacy endpoint for task ${taskId} (${taskType})`);
      
      // Determine which endpoint to use based on task type
      let endpoint = '';
      let responseField = '';
      
      if (taskType === 'kyb' || taskType === 'company_kyb') {
        endpoint = `/api/kyb/demo-autofill/${taskId}`;
        responseField = 'kybData';
      } else if (taskType === 'ky3p' || taskType === 'security' || taskType === 'security_assessment' || taskType === 'sp_ky3p_assessment') {
        endpoint = `/api/ky3p/demo-autofill/${taskId}`;
        responseField = 'ky3pData';
      } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        endpoint = `/api/open-banking/demo-autofill/${taskId}`;
        responseField = 'openBankingData';
      } else {
        throw new Error(`Unsupported task type: ${taskType}`);
      }
      
      // Call the appropriate endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Legacy endpoint returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data[responseField]) {
        // Apply the form data with verification and legacy flag
        console.log(`[Demo Auto-Fill] Got ${Object.keys(data[responseField]).length} fields from legacy endpoint`);
        const result = await applyAndVerifyFormData(data[responseField], updateField, resetForm, form, true);
        
        if (result.success) {
          // Force a re-render to ensure form state is correctly displayed
          setForceRerender(prev => !prev);
          
          // Save progress and refresh status
          try {
            await saveProgress();
            await refreshStatus();
            if (onProgress) onProgress(50); // Set to 50% by default
          } catch (saveError) {
            console.error('[Demo Auto-Fill] Error saving progress:', saveError);
          }
          
          toast({
            title: 'Demo Auto-Fill Complete',
            description: `Successfully filled ${Object.keys(data[responseField]).length} fields with demo data (legacy mode)`,
          });
        } else {
          // If verification still fails, try the most direct approach
          resetForm(data[responseField]);
          setForceRerender(prev => !prev);
          
          toast({
            title: 'Demo Auto-Fill Complete',
            description: 'Form filled with demo data (fallback mode)',
            variant: 'default',
          });
        }
      } else {
        throw new Error('Legacy endpoint did not return valid form data');
      }
    } catch (legacyError) {
      console.error('[Demo Auto-Fill] Legacy endpoint error:', legacyError);
      toast({
        title: 'Demo Auto-Fill Failed',
        description: legacyError instanceof Error ? legacyError.message : 'An unexpected error occurred with the legacy endpoint',
        variant: 'destructive',
      });
    }
  }
}