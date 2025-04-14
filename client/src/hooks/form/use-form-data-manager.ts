import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormServiceInterface, FormField, FormData } from '@/services/formService';
import { createFormSchema } from '@/utils/formUtils';
import getLogger from '@/utils/logger';

// Logger instance for this module
const logger = getLogger('FormDataManager', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

// The properties required by our hook
export interface UseFormDataManagerProps {
  formService: FormServiceInterface | null;
  taskId?: number;
  initialData?: FormData;
  fields: FormField[];
  onDataChange?: (data: FormData) => void;
}

// The state and methods returned by our hook
export interface FormDataManagerState {
  form: ReturnType<typeof useForm>;
  formData: FormData;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  updateField: (name: string, value: any) => void;
  saveProgress: () => Promise<boolean>;
  resetForm: (data?: FormData) => void;
}

/**
 * A hook to manage form data with reliable loading, updating, and saving
 */
export function useFormDataManager({
  formService,
  taskId,
  initialData = {},
  fields,
  onDataChange
}: UseFormDataManagerProps): FormDataManagerState {
  // Basic state
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialData || {});
  
  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to track if we've loaded data from the server
  const dataLoadedRef = useRef(false);
  
  // Create default values for all fields
  const createDefaultValues = useCallback((fieldList: FormField[]): FormData => {
    const defaults: FormData = {};
    
    // Set essential form fields
    defaults['taskId'] = taskId || '';
    
    // Set defaults for each field based on type
    fieldList.forEach(field => {
      switch (field.type) {
        case 'checkbox':
        case 'toggle':
          defaults[field.key] = false;
          break;
        case 'select':
        case 'multi-select':
          defaults[field.key] = field.type === 'multi-select' ? [] : '';
          break;
        default:
          // Default to empty string for text inputs and any unknown types
          defaults[field.key] = '';
      }
    });
    
    logger.debug(`Created default values for ${Object.keys(defaults).length} fields`);
    return defaults;
  }, [taskId]);
  
  // Initialize form with schema validation
  const defaultValues = createDefaultValues(fields);
  const form = useForm({
    defaultValues: { ...defaultValues, ...initialData },
    resolver: zodResolver(createFormSchema(fields)),
    mode: 'onChange',
  });
  
  // Load saved data from the server once when fields and service are available
  useEffect(() => {
    // Skip if no fields, service, or taskId, or if we've already loaded data
    if (fields.length === 0 || !formService || !taskId || dataLoadedRef.current) {
      return;
    }
    
    const loadSavedData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        logger.info(`Loading saved data for task ID: ${taskId}`);
        const savedData = await formService.loadProgress(taskId);
        
        if (savedData && Object.keys(savedData).length > 0) {
          logger.info(`Received saved data with ${Object.keys(savedData).length} fields`);
          
          // Normalize any null values to empty strings
          const normalizedData = Object.fromEntries(
            Object.entries(savedData).map(([key, value]) => [key, value === null ? '' : value])
          );
          
          // Update both state and form with complete data
          const completeData = {
            ...defaultValues,
            ...normalizedData
          };
          
          logger.info(`Updating form with normalized data: ${Object.keys(completeData).length} fields`);
          setFormData(completeData);
          form.reset(completeData);
          
          // Notify parent component if callback provided
          if (onDataChange) {
            onDataChange(completeData);
          }
        } else {
          logger.info('No saved data found, using default values');
        }
        
        // Mark as loaded regardless of result
        dataLoadedRef.current = true;
        setHasLoaded(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load saved data';
        logger.error('Failed to load form data:', message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSavedData();
  }, [fields, formService, taskId, defaultValues, form, onDataChange]);
  
  // Function to update a single field value
  const updateField = useCallback((name: string, value: any) => {
    if (!formService) {
      logger.warn('Cannot update field - form service is not available');
      return;
    }
    
    try {
      // Get current form data for comparison
      const currentData = formService.getFormData();
      const prevValue = currentData[name];
      
      logger.debug(`Updating field ${name}: ${prevValue} → ${value}`);
      
      // Normalize value consistently
      const normalizedValue = (value === null || value === undefined) ? '' : value;
      
      // Update in the form service
      formService.updateFormData(name, normalizedValue);
      
      // Update in React Hook Form
      form.setValue(name, normalizedValue, { 
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });
      
      // Update local state
      setFormData(current => {
        const updated = { ...current, [name]: normalizedValue };
        
        // Notify parent component if callback provided
        if (onDataChange) {
          onDataChange(updated);
        }
        
        return updated;
      });
      
      // Auto-save after a delay (debounced)
      if (taskId) {
        // Clear previous timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        
        // Set new timer
        saveTimerRef.current = setTimeout(() => {
          saveProgress().catch(err => {
            logger.error('Auto-save failed:', err);
          });
        }, 1500);
      }
    } catch (error) {
      logger.error(`Error updating field ${name}:`, error);
    }
  }, [formService, form, onDataChange, taskId]);
  
  // Function to save form progress
  const saveProgress = useCallback(async (): Promise<boolean> => {
    if (!formService || !taskId) {
      logger.warn('Cannot save progress - form service or taskId is not available');
      return false;
    }
    
    try {
      logger.info(`Saving progress for task ID: ${taskId}`);
      
      // Get latest data from the form service
      const currentData = formService.getFormData();
      logger.debug(`Form data before save: ${Object.keys(currentData).length} fields`);
      
      // Save to the server
      const result = await formService.save({
        taskId,
        includeMetadata: true
      });
      
      logger.info(`Save result: ${result ? 'success' : 'failed'}`);
      return !!result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save progress';
      logger.error('Save progress error:', message);
      setError(message);
      return false;
    }
  }, [formService, taskId]);
  
  // Function to reset the form with new data
  const resetForm = useCallback((data?: FormData) => {
    const resetData = data || defaultValues;
    logger.info(`Resetting form with ${Object.keys(resetData).length} fields`);
    
    // Reset the form
    form.reset(resetData);
    
    // Update local state
    setFormData(resetData);
    
    // Update form service if available
    if (formService) {
      Object.entries(resetData).forEach(([key, value]) => {
        formService.updateFormData(key, value);
      });
    }
    
    // Notify parent component if callback provided
    if (onDataChange) {
      onDataChange(resetData);
    }
  }, [form, defaultValues, formService, onDataChange]);
  
  // Return all the form state and methods
  return {
    form,
    formData,
    isLoading,
    hasLoaded,
    error,
    updateField,
    saveProgress,
    resetForm
  };
}
