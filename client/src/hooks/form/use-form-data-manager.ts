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
  
  // Function to save form progress - we define this first to avoid circular references
  const saveProgress = useCallback(async (): Promise<boolean> => {
    if (!formService || !taskId) {
      logger.warn('Cannot save progress - form service or taskId is not available');
      return false;
    }
    
    try {
      logger.info(`[SAVE DEBUG] Saving progress for task ID: ${taskId}`);
      
      // Get latest data from the form service
      const currentData = formService.getFormData();
      logger.info(`[SAVE DEBUG] Form data before save: ${Object.keys(currentData).length} fields`);
      
      // Save to the server
      const result = await formService.save({
        taskId,
        includeMetadata: true
      });
      
      logger.info(`[SAVE DEBUG] Save result: ${result ? 'SUCCESS' : 'FAILED'}`);
      return !!result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save progress';
      logger.error('[SAVE DEBUG] Save progress error:', message);
      setError(message);
      return false;
    }
  }, [formService, taskId]);
  
  // Function to update a single field value
  const updateField = useCallback((name: string, value: any) => {
    if (!formService) {
      logger.warn('Cannot update field - form service is not available');
      return;
    }
    
    if (!taskId) {
      logger.error('[SAVE DEBUG] CRITICAL ERROR: Cannot update field - taskId is not available');
      return;
    }
    
    try {
      logger.info(`[SAVE DEBUG] Starting field update for ${name} with taskId ${taskId}`);
      
      // Get current form data for comparison
      const currentData = formService.getFormData();
      const prevValue = currentData[name];
      
      // Log whether this is a field clearing operation or regular update
      const isClearing = 
        (prevValue !== undefined && prevValue !== null && prevValue !== '') && 
        (value === '' || value === null || value === undefined);
      
      if (isClearing) {
        logger.info(`[SAVE DEBUG] Clearing field ${name}: "${prevValue}" → (empty)`);
      } else {
        logger.info(`[SAVE DEBUG] Updating field ${name}: "${prevValue || '(empty)'}" → "${value}"`);
      }
      
      // Normalize value consistently
      const normalizedValue = (value === null || value === undefined) ? '' : value;
      
      // Always update in the form service, ensuring field clearing operations work
      // Pass taskId to enable immediate saving on critical operations
      logger.info(`[SAVE DEBUG] Calling updateFormData with taskId: ${taskId}`);
      formService.updateFormData(name, normalizedValue, taskId);
      
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
        
        logger.info(`[SAVE DEBUG] Local state updated for field ${name}`);
        return updated;
      });
      
      // Force always saving immediately for all field changes to ensure persistence
      if (taskId) {
        logger.info(`[SAVE DEBUG] Initiating immediate save for field ${name} with taskId ${taskId}`);
        
        // Clear previous timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        
        // FORCE IMMEDIATE SAVE FOR ALL FIELDS - Don't debounce
        logger.info('[SAVE DEBUG] Forcing immediate save without debounce');
        saveProgress()
          .then(result => {
            logger.info(`[SAVE DEBUG] Immediate save completed with result: ${result ? 'SUCCESS' : 'FAILED'}`);
          })
          .catch(err => {
            logger.error('[SAVE DEBUG] Immediate save failed with error:', err);
          });
      }
    } catch (error) {
      logger.error(`[SAVE DEBUG] Error updating field ${name}:`, error);
    }
  }, [formService, form, onDataChange, taskId, saveProgress]);
  
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
        
        logger.info(`[SAVE DEBUG] Loading saved data for task ID: ${taskId}`);
        const savedData = await formService.loadProgress(taskId);
        
        if (savedData && Object.keys(savedData).length > 0) {
          logger.info(`[SAVE DEBUG] Received saved data with ${Object.keys(savedData).length} fields`);
          
          // Normalize any null values to empty strings
          const normalizedData = Object.fromEntries(
            Object.entries(savedData).map(([key, value]) => [key, value === null ? '' : value])
          );
          
          // Update both state and form with complete data
          const completeData = {
            ...defaultValues,
            ...normalizedData
          };
          
          logger.info(`[SAVE DEBUG] Updating form with normalized data: ${Object.keys(completeData).length} fields`);
          setFormData(completeData);
          form.reset(completeData);
          
          // Notify parent component if callback provided
          if (onDataChange) {
            onDataChange(completeData);
          }
        } else {
          logger.info('[SAVE DEBUG] No saved data found, using default values');
        }
        
        // Mark as loaded regardless of result
        dataLoadedRef.current = true;
        setHasLoaded(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load saved data';
        logger.error('[SAVE DEBUG] Failed to load form data:', message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSavedData();
  }, [fields, formService, taskId, defaultValues, form, onDataChange]);
  
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
        // Pass taskId to enable immediate saving when needed
        formService.updateFormData(key, value, taskId);
      });
    }
    
    // Notify parent component if callback provided
    if (onDataChange) {
      onDataChange(resetData);
    }
  }, [form, defaultValues, formService, onDataChange, taskId]);
  
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