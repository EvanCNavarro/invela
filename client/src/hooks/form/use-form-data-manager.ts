import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormServiceInterface, FormField, FormData } from '@/services/formService';
import { createFormSchema } from '@/utils/formUtils';
import getLogger from '@/utils/logger';

// Logger instance for this module with debug logs disabled for performance
const logger = getLogger('FormDataManager', { 
  levels: { debug: false, info: true, warn: true, error: true } 
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
  
  // Ref to track the latest form data for unmount saves
  const latestFormDataRef = useRef<FormData>(initialData || {});
  
  // Keep track of any in-progress save operation
  const saveInProgressRef = useRef<boolean>(false);
  const pendingSaveDataRef = useRef<FormData | null>(null);
  
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
    
    // If there's already a save in progress, store the current data for later
    if (saveInProgressRef.current) {
      logger.info('[SAVE DEBUG] Save in progress, storing current data for later save');
      pendingSaveDataRef.current = { ...latestFormDataRef.current };
      return false;
    }
    
    // Mark that a save is in progress
    saveInProgressRef.current = true;
    
    try {
      logger.info(`[SAVE DEBUG] Saving progress for task ID: ${taskId}`);
      
      // Get latest data from the form service
      const currentData = formService.getFormData();
      
      // Log detailed information about the form data
      logger.info(`[SAVE DEBUG] Form data before save: ${Object.keys(currentData).length} fields`);
      
      // Add more detailed logging for specific fields we care about
      const keysToLog = ['businessType', 'registrationNumber', 'corporateRegistration', 'goodStanding'];
      logger.info(`[SAVE DEBUG] Values for key fields before save:`);
      keysToLog.forEach(key => {
        logger.info(`[SAVE DEBUG] - ${key}: "${currentData[key] || '(empty)'}" (${typeof currentData[key]})`);
      });
      
      // Get stack trace to understand who's calling save
      const stack = new Error().stack;
      logger.info(`[SAVE DEBUG] saveProgress called from: ${stack?.split('\n')[2] || 'unknown'}`);
      
      // Save to the server
      const result = await formService.save({
        taskId,
        includeMetadata: true
      });
      
      // Enhanced post-save logging 
      logger.info(`[SAVE DEBUG] Save result: ${result ? 'SUCCESS' : 'FAILED'}`);
      
      // Check if data actually persisted
      const afterSaveData = formService.getFormData();
      logger.info(`[SAVE DEBUG] Form data after save: ${Object.keys(afterSaveData).length} fields`);
      
      // Log the same fields as before to compare
      logger.info(`[SAVE DEBUG] Values for key fields after save:`);
      keysToLog.forEach(key => {
        logger.info(`[SAVE DEBUG] - ${key}: "${afterSaveData[key] || '(empty)'}" (${typeof afterSaveData[key]})`);
      });
      
      // Mark that we've completed the save
      saveInProgressRef.current = false;
      
      // Check if there's pending data that needs to be saved
      if (pendingSaveDataRef.current) {
        const pendingData = pendingSaveDataRef.current;
        pendingSaveDataRef.current = null;
        
        logger.info('[SAVE DEBUG] Processing pending data from previous save');
        
        // Update form service with latest pending data
        Object.entries(pendingData).forEach(([key, value]) => {
          formService.updateFormData(key, value);
        });
        
        // Trigger another save (reusing this same function)
        setTimeout(() => {
          saveProgress().catch(err => {
            logger.error('[SAVE DEBUG] Pending data save failed:', err);
          });
        }, 0);
      }
      
      return !!result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save progress';
      logger.error('[SAVE DEBUG] Save progress error:', message);
      setError(message);
      
      // Even on failure, mark that we're no longer saving
      saveInProgressRef.current = false;
      return false;
    }
  }, [formService, taskId]);
  
  // Function to update a single field value with enhanced synchronization and validation
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
      // Add timestamp to track update time
      const updateTimestamp = Date.now();
      logger.info(`[SAVE DEBUG] ${updateTimestamp}: Starting field update for ${name} with taskId ${taskId}`);
      
      // Get current form data for comparison
      const currentData = formService.getFormData();
      const prevValue = currentData[name];
      
      // Log whether this is a field clearing operation or regular update
      const isClearing = 
        (prevValue !== undefined && prevValue !== null && prevValue !== '') && 
        (value === '' || value === null || value === undefined);
      
      if (isClearing) {
        logger.info(`[SAVE DEBUG] ${updateTimestamp}: Clearing field ${name}: "${prevValue}" → (empty)`);
      } else {
        logger.info(`[SAVE DEBUG] ${updateTimestamp}: Updating field ${name}: "${prevValue || '(empty)'}" → "${value}"`);
      }
      
      // Enhanced normalization for more consistent value handling
      let normalizedValue: any;
      if (value === null || value === undefined) {
        normalizedValue = '';
      } else if (typeof value === 'string') {
        // Normalize string values - trim and handle special cases
        normalizedValue = value.trim();
        // Convert "null" and "undefined" strings to empty strings
        if (normalizedValue === 'null' || normalizedValue === 'undefined') {
          normalizedValue = '';
        }
      } else {
        // Keep non-string values as-is (arrays, objects, booleans, etc.)
        normalizedValue = value;
      }
      
      // Always update in the form service, ensuring field clearing operations work
      // Pass taskId to enable immediate saving on critical operations
      logger.info(`[SAVE DEBUG] ${updateTimestamp}: Calling updateFormData with taskId: ${taskId}`);
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
        
        // Store latest form data in ref for unmount saves
        latestFormDataRef.current = updated;
        
        // Notify parent component if callback provided
        if (onDataChange) {
          onDataChange(updated);
        }
        
        logger.info(`[SAVE DEBUG] ${updateTimestamp}: Local state updated for field ${name}`);
        
        // Add additional debug validation - ensure the value was actually set correctly
        const setVerification = updated[name] === normalizedValue;
        if (!setVerification) {
          logger.error(`[SAVE DEBUG] ${updateTimestamp}: VALUE MISMATCH - State was not updated correctly for ${name}`);
          logger.error(`[SAVE DEBUG] Expected: ${normalizedValue}, Actual: ${updated[name]}`);
        }
        
        return updated;
      });
      
      // Force always saving immediately for all field changes to ensure persistence
      if (taskId) {
        logger.info(`[SAVE DEBUG] ${updateTimestamp}: Initiating immediate save for field ${name} with taskId ${taskId}`);
        
        // Clear previous timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        
        // FORCE IMMEDIATE SAVE FOR ALL FIELDS - Don't debounce
        logger.info(`[SAVE DEBUG] ${updateTimestamp}: Forcing immediate save without debounce`);
        saveProgress()
          .then(result => {
            logger.info(`[SAVE DEBUG] ${updateTimestamp}: Immediate save completed with result: ${result ? 'SUCCESS' : 'FAILED'}`);
            
            // Verify data after save
            const postSaveData = formService.getFormData();
            const savedValue = postSaveData[name];
            const savedValueMatch = savedValue === normalizedValue;
            
            if (!savedValueMatch) {
              logger.error(`[SAVE DEBUG] ${updateTimestamp}: POST-SAVE VERIFICATION FAILED for field ${name}`);
              logger.error(`[SAVE DEBUG] Expected: ${normalizedValue}, Saved: ${savedValue}`);
              
              // Attempt to fix the value by updating it again
              logger.info(`[SAVE DEBUG] ${updateTimestamp}: Attempting to fix value by updating again`);
              formService.updateFormData(name, normalizedValue, taskId);
              
              // Force a second save to ensure persistence
              setTimeout(() => {
                saveProgress()
                  .then(fixResult => {
                    logger.info(`[SAVE DEBUG] ${updateTimestamp}: Fix save completed with result: ${fixResult ? 'SUCCESS' : 'FAILED'}`);
                  })
                  .catch(fixErr => {
                    logger.error(`[SAVE DEBUG] ${updateTimestamp}: Fix save failed with error:`, fixErr);
                  });
              }, 100);
            } else {
              logger.info(`[SAVE DEBUG] ${updateTimestamp}: Post-save verification passed for field ${name}`);
            }
          })
          .catch(err => {
            logger.error(`[SAVE DEBUG] ${updateTimestamp}: Immediate save failed with error:`, err);
          });
      }
    } catch (error) {
      logger.error(`[SAVE DEBUG] Error updating field ${name}:`, error);
    }
  }, [formService, form, onDataChange, taskId, saveProgress]);

  // Effect to ensure data is saved when component unmounts
  useEffect(() => {
    // Skip if no service or taskId
    if (!formService || !taskId) {
      return;
    }
    
    // Return cleanup function that will execute on unmount
    return () => {
      // Always cancel any pending timer if it exists
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      
      logger.info('[SAVE DEBUG] Unmount detected - Forcing immediate save of latest data');
      
      // Get the latest form data from our ref (which should be up-to-date)
      const latestData = latestFormDataRef.current;
      
      // Check if we have a valid form service, task ID, and data to save
      if (!formService || !taskId || Object.keys(latestData).length === 0) {
        logger.info('[SAVE DEBUG] No data to save on unmount');
        return;
      }
      
      // Check if there's a save operation in progress
      if (saveInProgressRef.current) {
        logger.info('[SAVE DEBUG] Save operation already in progress, storing latest data for save');
        // Store the pending data to be saved after the current operation completes
        pendingSaveDataRef.current = { ...latestData };
        return;
      }
        
      // Mark that we're starting a save operation
      saveInProgressRef.current = true;
      
      // Update the form service data with latest values
      Object.entries(latestData).forEach(([key, value]) => {
        formService.updateFormData(key, value);
      });
      
      // Perform an immediate save using a unique timestamp to help with debugging
      const saveTimestamp = Date.now();
      logger.info(`[SAVE DEBUG] Starting unmount save #${saveTimestamp}`);
    
      try {
        // Perform a synchronous save if possible to ensure it completes before unmount
        formService.save({ taskId, includeMetadata: true })
          .then(result => {
            logger.info(`[SAVE DEBUG] Unmount save #${saveTimestamp} completed with result: ${result ? 'SUCCESS' : 'FAILED'}`);
            saveInProgressRef.current = false;
            
            // Check if there's pending data that needs to be saved
            if (pendingSaveDataRef.current) {
              const pendingData = pendingSaveDataRef.current;
              pendingSaveDataRef.current = null;
              
              // Update form service with latest pending data
              Object.entries(pendingData).forEach(([key, value]) => {
                formService.updateFormData(key, value);
              });
              
              // Save the pending data
              formService.save({ taskId, includeMetadata: true })
                .then(pendingResult => {
                  logger.info(`[SAVE DEBUG] Pending data save completed with result: ${pendingResult ? 'SUCCESS' : 'FAILED'}`);
                })
                .catch(pendingErr => {
                  logger.error('[SAVE DEBUG] Pending data save failed with error:', pendingErr);
                });
            }
          })
          .catch(err => {
            logger.error(`[SAVE DEBUG] Unmount save #${saveTimestamp} failed with error:`, err);
            saveInProgressRef.current = false;
          });
      } catch (error) {
        logger.error(`[SAVE DEBUG] Unmount save #${saveTimestamp} threw exception:`, error);
        saveInProgressRef.current = false;
      }
    };
  }, [formService, taskId]);

  // Load saved data from the server when the form is initialized or critical dependencies change
  useEffect(() => {
    // Skip if no fields, service, or taskId
    if (fields.length === 0 || !formService || !taskId) {
      return;
    }
    
    // Use a loading key to handle concurrency rather than a ref
    // This ensures we don't get stuck in loading state
    let loadingKey = Date.now();
    const thisLoadingKey = loadingKey;
    
    const loadSavedData = async () => {
      try {
        // Only set loading state if we haven't already loaded data
        // or if we're deliberately forcing a reload
        if (!dataLoadedRef.current) {
          setIsLoading(true);
        }
        setError(null);
        
        logger.info(`[SAVE DEBUG] Loading data for task ID: ${taskId}`);
        
        // Log API call details
        logger.info(`[SAVE DEBUG] Calling loadProgress for task ${taskId} with service: ${formService.constructor.name}`);
        
        // Get stack trace to understand who's calling load
        const stack = new Error().stack;
        logger.info(`[SAVE DEBUG] loadProgress called from: ${stack?.split('\n')[2] || 'unknown'}`);
        
        const savedData = await formService.loadProgress(taskId);
        
        // Skip processing if another load operation has started
        if (thisLoadingKey !== loadingKey) {
          logger.debug('[SAVE DEBUG] Ignoring outdated load request');
          return;
        }
        
        if (savedData && Object.keys(savedData).length > 0) {
          logger.info(`[SAVE DEBUG] Received saved data with ${Object.keys(savedData).length} fields`);
          
          // Log detailed information about the form data
          const keysToLog = ['businessType', 'registrationNumber', 'corporateRegistration', 'goodStanding'];
          logger.info(`[SAVE DEBUG] Values for key fields loaded from server:`);
          keysToLog.forEach(key => {
            logger.info(`[SAVE DEBUG] - ${key}: "${savedData[key] || '(empty)'}" (${typeof savedData[key]})`);
          });
          
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
          
          // Log the same fields after normalization
          logger.info(`[SAVE DEBUG] Values for key fields after normalization:`);
          keysToLog.forEach(key => {
            logger.info(`[SAVE DEBUG] - ${key}: "${completeData[key] || '(empty)'}" (${typeof completeData[key]})`);
          });
          
          setFormData(completeData);
          form.reset(completeData);
          
          // Notify parent component if callback provided
          if (onDataChange) {
            onDataChange(completeData);
          }
        } else {
          logger.info('[SAVE DEBUG] No saved data found, using default values');
          // Still reset the form with default values
          setFormData(defaultValues);
          form.reset(defaultValues);
        }
        
        // Mark as loaded regardless of result
        dataLoadedRef.current = true;
        setHasLoaded(true);
      } catch (error) {
        // Only process error if this is still the active request
        if (thisLoadingKey === loadingKey) {
          const message = error instanceof Error ? error.message : 'Failed to load saved data';
          logger.error('[SAVE DEBUG] Failed to load form data:', message);
          setError(message);
        }
      } finally {
        // Only change loading state if this is still the active request
        if (thisLoadingKey === loadingKey) {
          setIsLoading(false);
        }
      }
    };
    
    // Load data if we haven't loaded it yet
    if (!dataLoadedRef.current) {
      loadSavedData();
    }
    
    // Expose a method to force reload data that can be called from parent components
    const reloadData = () => {
      loadingKey = Date.now(); // Update the loading key to cancel any in-progress loads
      dataLoadedRef.current = false; // Reset the loaded flag
      loadSavedData(); // Start a new load
    };
    
    // Add reload method to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).reloadFormData = reloadData;
    }
    
    // Clean up function that preserves the loaded state
    // This prevents unnecessary reloads when component re-renders
    return () => {
      // We intentionally do NOT reset dataLoadedRef.current here
      // to prevent unnecessary reloads on re-renders
      
      // But we do update the loading key to cancel any in-progress requests
      loadingKey = Date.now();
    };
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