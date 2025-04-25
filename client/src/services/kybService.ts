import { FormData, FormField, FormSection, FormServiceInterface, FormSubmitOptions } from './formService';
import { getFieldComponentType } from '../utils/formUtils';
import getLogger from '../utils/logger';
import { calculateTaskStatus as calculateTaskStatusUtil } from '../utils/formStatusUtils';

/**
 * Sort KYB fields by their group and then by order
 * @param fields Array of KYB fields to sort
 * @returns Sorted array of KYB fields
 */
const sortFields = (fields: any[]): any[] => {
  if (!Array.isArray(fields)) {
    console.error('[DEBUG] sortFields received non-array input:', fields);
    return [];
  }
  
  // Safe sorting - handle potential missing properties
  return [...fields].sort((a, b) => {
    // First sort by group name
    const groupA = a?.group || '';
    const groupB = b?.group || '';
    
    if (groupA < groupB) return -1;
    if (groupA > groupB) return 1;
    
    // Then sort by order within the same group
    const orderA = a?.order || 0;
    const orderB = b?.order || 0;
    return orderA - orderB;
  });
};

/**
 * Represents a KYB field from the database
 */
export interface KybField {
  id: number;
  field_key: string;
  display_name: string;
  field_type: string;
  question: string;
  group: string;
  required: boolean;
  order: number;
  validation_rules: any;
  help_text: string | null;
  answer_expectation: string | null;
  demo_autofill: string | null; 
  validation_type: string | null;
}

/**
 * Response structure for KYB progress data
 */
export interface KybProgressResponse {
  formData: Record<string, any>;
  progress: number;
  status?: string;
}

/**
 * KYB Form Service - Clean Implementation
 * Handles loading, saving and submitting KYB form data
 */
export class KybFormService implements FormServiceInterface {
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private formData: Record<string, any> = {};
  private initialized = false;
  private templateId: number | null = null;
  private currentTaskId: number | null = null; // Track current task ID for resetData method
  private taskStatus: string = 'not_started'; // Status of the task/form
  private logger = getLogger('KYB Service');
  
  // For debouncing and state tracking
  private saveProgressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSavedData: string = '';
  
  // Static cache for fields to prevent redundant API calls
  private static fieldsCache: Record<number, KybField[]> = {};
  
  /**
   * Initialize the KYB form service
   * @param templateId ID of the task template
   */
  async initialize(templateId: number): Promise<void> {
    if (this.initialized && this.templateId === templateId) {
      this.logger.info('KybService already initialized with template:', templateId);
      return; // Already initialized with this template
    }

    try {
      this.templateId = templateId;
      this.logger.info(`KybService initializing with template ID: ${templateId}`);
      
      // CLEAR PREVIOUS STATE to ensure fresh initialization
      this.fields = [];
      this.sections = [];
      this.initialized = false;
      
      // Fetch KYB fields from the server or cache
      const fields = await this.getKybFields();
      this.logger.info(`Retrieved KYB fields from API: ${fields.length}`);
      
      if (fields.length === 0) {
        this.logger.error('No KYB fields retrieved from API - form will be empty');
        this.initialized = true; // Mark as initialized even though it's empty
        return;
      }
      
      // Log the first field to help diagnose format issues
      this.logger.info('Sample first field:', {
        id: fields[0].id,
        key: fields[0].field_key,
        type: fields[0].field_type,
        group: fields[0].group
      });
      
      // Convert fields to form fields and organize into sections
      this.fields = fields.map(field => this.convertToFormField(field));
      
      // Group fields by section name
      const groupedFields = this.groupFieldsBySection(fields);
      this.logger.info(`Field grouping result: ${Object.keys(groupedFields).length} groups found`);
      
      // Log the sections we found versus what we expect
      this.logger.info(`Grouped field sections: ${Object.keys(groupedFields).join(', ')}`);
      
      // Standard expected section names in the correct order
      const expectedSections = [
        'Company Profile',
        'Governance & Leadership',
        'Financial Profile',
        'Operations & Compliance'
      ];
      
      this.logger.info(`Expected section names: ${expectedSections.join(', ')}`);
      
      // Ensure we have all standard sections, even if empty
      const normalizedSections: Record<string, KybField[]> = {};
      
      // First, populate with expected sections (empty arrays if no fields)
      expectedSections.forEach(section => {
        normalizedSections[section] = groupedFields[section] || [];
        this.logger.info(`Section ${section} has ${normalizedSections[section].length} fields`);
      });
      
      // Then add any additional sections from groupedFields that aren't standard
      Object.entries(groupedFields).forEach(([sectionName, sectionFields]) => {
        if (!expectedSections.includes(sectionName)) {
          normalizedSections[sectionName] = sectionFields;
          this.logger.info(`Additional section ${sectionName} has ${sectionFields.length} fields`);
        }
      });
      
      this.logger.info('Creating sections from fields. Sections found:', Object.keys(normalizedSections).join(', '));
      
      // Create sections from normalized grouped fields with proper interface implementation
      // Use the expected order for standard sections
      this.sections = Object.entries(normalizedSections).map(([sectionName, sectionFields], index) => {
        // Find index in expectedSections to determine proper order
        const expectedIndex = expectedSections.indexOf(sectionName);
        const order = expectedIndex >= 0 ? expectedIndex + 1 : expectedSections.length + index + 1;
        const sectionId = `section-${order}`;
        
        this.logger.info(`Creating section "${sectionName}" with ID "${sectionId}" (${sectionFields.length} fields)`);
        
        // Create the section with the properly assigned fields
        const section = {
          id: sectionId,      // FormSection requires string ID
          title: sectionName, // Use title instead of name
          description: '',
          order: order,
          collapsed: false,
          // Convert each field and assign the proper section ID
          fields: sectionFields.map(field => this.convertToFormField(field, sectionId))
        };
        
        return section;
      });
      
      // Sort sections by order
      this.sections.sort((a, b) => a.order - b.order);
      
      // CRITICAL FIX: Update the main fields array by extracting all fields from sections
      // This ensures all fields have the correct section ID assigned
      this.fields = this.sections.reduce((allFields, section) => {
        return [...allFields, ...section.fields];
      }, []);
      
      // Log the created sections and field counts
      this.logger.info('Created sections:');
      this.sections.forEach(section => {
        this.logger.info(`- Section "${section.title}" with ${section.fields.length} fields (order: ${section.order})`);
      });
      
      // Verify all fields have section IDs
      const fieldsWithoutSection = this.fields.filter(field => !field.section);
      if (fieldsWithoutSection.length > 0) {
        this.logger.warn(`WARNING: ${fieldsWithoutSection.length} fields don't have section IDs assigned`);
        fieldsWithoutSection.forEach(field => {
          this.logger.warn(`- Field without section: ${field.key}`);
        });
      } else {
        this.logger.info(`Success: All ${this.fields.length} fields have section IDs correctly assigned`);
      }
      
      this.initialized = true;
      this.logger.info('KybService initialization complete.');
    } catch (error) {
      console.error('Error initializing KYB form service:', error);
      throw error;
    }
  }

  /**
   * Fetches KYB fields from the server or cache
   */
  async getKybFields(): Promise<KybField[]> {
    // Use cache if available
    if (this.templateId && KybFormService.fieldsCache[this.templateId]) {
      console.log('[DEBUG] Using cached fields for template:', this.templateId);
      return KybFormService.fieldsCache[this.templateId];
    }
    
    try {
      this.logger.info('Fetching KYB fields from server - DIAGNOSTIC MODE');
      // Simple fetch without all the timeout complexity
      const response = await fetch('/api/kyb/fields');
      
      if (!response.ok) {
        this.logger.error(`Failed to fetch KYB fields: ${response.status}`);
        throw new Error(`Failed to fetch KYB fields: ${response.status}`);
      }
      
      const responseData = await response.json();
      this.logger.info('KYB fields raw response TYPE:', typeof responseData);
      this.logger.info('KYB fields raw response KEYS:', Object.keys(responseData));
      this.logger.info('KYB fields success flag:', responseData.success);
      this.logger.info('KYB fields.fields type:', Array.isArray(responseData.fields) ? 'Array' : typeof responseData.fields);
      
      if (responseData.fields) {
        this.logger.info('KYB fields.fields length:', responseData.fields.length);
        if (responseData.fields.length > 0) {
          this.logger.info('Sample field:', JSON.stringify(responseData.fields[0]));
        }
      }
      
      // Check if the response has a fields property (API may return { fields: [...] })
      const fields = responseData.fields || responseData;
      
      if (!Array.isArray(fields)) {
        this.logger.error('KYB fields is not an array:', fields);
        throw new Error('KYB fields response is not in expected format');
      }
      
      this.logger.info('Successfully parsed KYB fields, count:', fields.length);
      
      // Sort fields by group and then by order
      const sortedFields = sortFields(fields);
      console.log('[DEBUG] Fields sorted by group and order');
      
      // Cache the fields
      if (this.templateId) {
        KybFormService.fieldsCache[this.templateId] = sortedFields;
        console.log('[DEBUG] Fields cached for template:', this.templateId);
      }
      
      return sortedFields;
    } catch (error) {
      console.error('Error fetching KYB fields:', error);
      throw error;
    }
  }

  /**
   * Get KYB fields for a specific step/section
   */
  async getKybFieldsByStepIndex(stepIndex: number): Promise<KybField[]> {
    const fields = await this.getKybFields();
    
    // Group fields by section name
    const groupedFields = this.groupFieldsBySection(fields);
    
    // Get section names in order
    const sectionNames = Object.keys(groupedFields);
    
    // Get the section name for the requested step index
    const sectionName = sectionNames[stepIndex - 1];
    
    // Return fields for the section or empty array if section doesn't exist
    return sectionName ? groupedFields[sectionName] : [];
  }

  /**
   * Group KYB fields by their section name
   */
  groupFieldsBySection(fields: KybField[]): Record<string, KybField[]> {
    // Standard section names we want to use - use a more comprehensive approach
    const sectionMap: Record<string, string> = {
      // Company Profile variations - IMPORTANT: Match the exact DB value!
      'companyprofile': 'Company Profile',
      'company_profile': 'Company Profile',
      'company profile': 'Company Profile',
      'companyProfile': 'Company Profile',
      
      // Governance & Leadership variations
      'governanceleadership': 'Governance & Leadership',
      'governance_leadership': 'Governance & Leadership',
      'governance leadership': 'Governance & Leadership',
      'governanceLeadership': 'Governance & Leadership',
      'governance': 'Governance & Leadership',
      'leadership': 'Governance & Leadership',
      
      // Financial Profile variations
      'financialprofile': 'Financial Profile',
      'financial_profile': 'Financial Profile',
      'financial profile': 'Financial Profile',
      'financialProfile': 'Financial Profile',
      'financial': 'Financial Profile',
      
      // Operations & Compliance variations
      'operationscompliance': 'Operations & Compliance',
      'operations_compliance': 'Operations & Compliance',
      'operations compliance': 'Operations & Compliance',
      'operationsCompliance': 'Operations & Compliance',
      'operations': 'Operations & Compliance',
      'compliance': 'Operations & Compliance'
    };
    
    // CRITICAL FIX: Directly map the four exact group names from database
    sectionMap['companyProfile'] = 'Company Profile';
    sectionMap['governanceLeadership'] = 'Governance & Leadership';
    sectionMap['financialProfile'] = 'Financial Profile';
    sectionMap['operationsCompliance'] = 'Operations & Compliance';
    
    // Log for debugging
    console.log('[DEBUG] KybService - Grouping fields by section. Found fields:', fields.length);
    
    // Group fields by their normalized section name
    const grouped: Record<string, KybField[]> = {};
    
    // First pass - map known section names
    fields.forEach(field => {
      // Use a more permissive approach to field grouping
      let rawGroup = field.group || '';
      if (!rawGroup || rawGroup.trim() === '') {
        rawGroup = 'Other'; // Default group
      }
      
      // Convert to lowercase and remove special chars for matching
      const simplifiedKey = rawGroup.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Find the matching section or use the raw group name
      const normalizedGroup = sectionMap[simplifiedKey] || sectionMap[rawGroup] || rawGroup;
      
      console.log(`[DEBUG] Field grouping: "${field.field_key}" → raw group: "${rawGroup}" → normalized: "${normalizedGroup}"`);
      
      // Initialize the group if it doesn't exist
      if (!grouped[normalizedGroup]) {
        grouped[normalizedGroup] = [];
      }
      
      // Add the field to its group
      grouped[normalizedGroup].push(field);
    });
    
    // Return the grouped fields
    return grouped;
  }

  /**
   * Convert KYB field to form field format
   * @param field The KYB field to convert
   * @param sectionId Optional section ID to assign to the field
   */
  convertToFormField(field: KybField, sectionId?: string): FormField {
    this.logger.debug(`Converting field "${field.field_key}" to form field format. Section: ${sectionId || 'unknown'}`);
    
    return {
      id: field.id,
      key: field.field_key,
      label: field.display_name,
      type: getFieldComponentType(field.field_type),
      required: field.required,
      question: field.question,
      order: field.order,
      validation: field.validation_rules,
      helpText: field.help_text,
      placeholder: '',
      value: this.formData[field.field_key] || '',
      section: sectionId, // Assign the section ID to the field
      
      // Enhanced field guidance properties
      answerExpectation: field.answer_expectation,
      demoAutofill: field.demo_autofill,
      validationType: field.validation_type
    };
  }

  /**
   * Get all form fields
   */
  getFields(): FormField[] {
    return this.fields;
  }

  /**
   * Get all form sections
   */
  getSections(): FormSection[] {
    return this.sections;
  }

  /**
   * Load form data
   */
  loadFormData(data: Record<string, any>): void {
    this.formData = { ...data };
    
    // Update field values with loaded data
    this.fields = this.fields.map(field => ({
      ...field,
      value: data[field.key] !== undefined ? data[field.key] : field.value
    }));
    
    // Update section field values
    this.sections = this.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => ({
        ...field,
        value: data[field.key] !== undefined ? data[field.key] : field.value
      }))
    }));
  }

  /**
   * Update form data for a specific field
   * This method now immediately saves data to the server, especially when clearing fields
   */
  // CRITICAL BUGFIX: Completely revised update method to ensure data persistence
  updateFormData(fieldKey: string, value: any, taskId?: number): void {
    const updateTimestamp = Date.now(); // Add timestamp for tracking
    
    // Log the update attempt for debugging with more details
    console.log(`[FORM DEBUG] ----- updateFormData BEGIN ${updateTimestamp} -----`);
    console.log(`[FORM DEBUG] ${updateTimestamp}: updateFormData called for field "${fieldKey}" with taskId: ${taskId || 'none'}`);
    
    // Store the old value for reference
    const oldValue = this.formData[fieldKey];
    
    // Normalize value - handle null, undefined, and empty values properly
    // This is critical for proper form field updates
    // Empty string is a valid value that should be stored and saved to database
    const normalizedValue = (value === null || value === undefined) ? '' : value;
    
    // Track if the field previously had a value but is now being cleared
    const isClearing = (oldValue !== undefined && oldValue !== null && oldValue !== '') && 
                       (normalizedValue === '' || normalizedValue === null);
    
    // More accurate change detection - convert to strings to ensure proper comparison
    // But preserve type for actual storage
    const oldValueStr = oldValue !== undefined ? String(oldValue) : '';
    const newValueStr = normalizedValue !== undefined ? String(normalizedValue) : '';
    
    // Use string comparison to detect changes, but always update when clearing a field
    const hasChanged = oldValueStr !== newValueStr || isClearing;
    console.log(`[FORM DEBUG] ${updateTimestamp}: Value change detection: ${hasChanged ? 'CHANGED' : 'UNCHANGED'}`);
    console.log(`[FORM DEBUG] ${updateTimestamp}: - Old value: "${oldValueStr}" (${typeof oldValue})`);
    console.log(`[FORM DEBUG] ${updateTimestamp}: - New value: "${newValueStr}" (${typeof normalizedValue})`);
    
    if (!hasChanged) {
      console.log(`[FORM DEBUG] ${updateTimestamp}: Skipping update - value unchanged for field ${fieldKey}`);
      console.log(`[FORM DEBUG] ----- updateFormData END ${updateTimestamp} (no change) -----`);
      return; // Value hasn't changed, no need to update
    }
    
    // *** CRITICAL FIX: Always update all data stores immediately ***
    
    // Always update the value in the internal formData object
    this.formData[fieldKey] = normalizedValue;
    
    // Update the field value in fields array
    this.fields = this.fields.map(field => 
      field.key === fieldKey ? { ...field, value: normalizedValue } : field
    );
    
    // Update the field value in sections
    this.sections = this.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => 
        field.key === fieldKey ? { ...field, value: normalizedValue } : field
      )
    }));
    
    console.log(`[FORM DEBUG] ${updateTimestamp}: Updated all memory stores for field "${fieldKey}"`);
    
    // *** CRITICAL FIX: ALWAYS trigger an immediate persistence operation ***
    if (taskId) {
      console.log(`[FORM DEBUG] ${updateTimestamp}: ⚠️ EMERGENCY SAVE triggered for field "${fieldKey}" with taskId ${taskId}`);
      
      // Cancel any pending timers to avoid race conditions
      if (this.saveProgressTimer) {
        clearTimeout(this.saveProgressTimer);
        this.saveProgressTimer = null;
      }
      
      // *** CRITICAL FIX: Skip saveProgress and call API directly to save immediately ***
      try {
        // Calculate progress and status
        const progress = this.calculateProgress();
        const status = this.calculateTaskStatus();
        
        console.log(`[FORM DEBUG] ${updateTimestamp}: DIRECT SAVE starting with progress=${progress}%, status=${status}`);
        
        // Use the direct API method, bypassing the debounce mechanism entirely
        this.saveKybProgress(taskId, progress, this.formData, status)
          .then(result => {
            if (result && result.success) {
              // Update lastSavedData reference after successful save
              this.lastSavedData = JSON.stringify(this.formData);
              console.log(`[FORM DEBUG] ${updateTimestamp}: ✅ DIRECT SAVE successful for "${fieldKey}"`);
              
              // Double-check the value was saved correctly
              if (result.savedData && result.savedData.formData) {
                const savedValue = result.savedData.formData[fieldKey];
                if (String(savedValue) !== newValueStr) {
                  console.error(`[FORM DEBUG] ${updateTimestamp}: ⚠️ VALUE MISMATCH in server response!`);
                  console.error(`[FORM DEBUG] ${updateTimestamp}: Expected "${newValueStr}", got "${savedValue}"`);
                  
                  // CRITICAL FIX: Force local value to match current client value
                  // This ensures client changes take precedence over inconsistent server values
                  if (result.savedData.formData) {
                    console.log(`[FORM DEBUG] ${updateTimestamp}: Correcting server response data to match client value`);
                    result.savedData.formData[fieldKey] = normalizedValue;
                  }
                }
              }
            } else {
              console.error(`[FORM DEBUG] ${updateTimestamp}: ❌ DIRECT SAVE failed:`, result?.error || 'Unknown error');
            }
          })
          .catch(err => {
            console.error(`[FORM DEBUG] ${updateTimestamp}: ❌ DIRECT SAVE exception:`, err);
          });
      } catch (error) {
        console.error(`[FORM DEBUG] ${updateTimestamp}: ❌ FATAL ERROR during direct save:`, error);
      }
    } else {
      console.error(`[FORM DEBUG] ${updateTimestamp}: ⚠️ CRITICAL: No taskId provided - cannot persist changes!`);
    }
    
    console.log(`[FORM DEBUG] ----- updateFormData END ${updateTimestamp} -----`);
  }

  /**
   * Get current form data
   */
  getFormData(): Record<string, any> {
    return this.formData;
  }

  /**
   * Calculate form completion progress
   * This ensures consistent progress calculation with the UI
   */
  calculateProgress(): number {
    // If no fields are defined, return 0
    if (this.fields.length === 0) {
      return 0;
    }
    
    // Count all fields regardless of required status to match UI behavior
    const filledFields = this.fields.filter(field => {
      const value = this.formData[field.key];
      // Consistent with UI criteria for field completion
      return value !== undefined && value !== null && value !== '';
    });
    
    const totalFields = this.fields.length;
    
    // Calculate percentage
    const progressPercentage = totalFields > 0 
      ? Math.round((filledFields.length / totalFields) * 100) 
      : 0;
    
    return progressPercentage;
  }
  
  /**
   * Helper method to check if form has been submitted
   * @returns True if the form has a submission date
   */
  getLastSubmissionDate(): string | null {
    // This is a placeholder - in a real implementation, this would retrieve the submission date
    // from the task metadata or another source
    return null;
  }

  /**
   * Get the current task status
   * This returns the stored status, which may have come from the server
   * @returns The current task status
   */
  getTaskStatus(): string {
    return this.taskStatus;
  }
  
  /**
   * Compare two form data objects and return the differences
   * This is useful for debugging to see what changed between client and server
   */
  compareFormData(currentData: Record<string, any>, serverData: Record<string, any>): Array<{key: string, currentValue: any, serverValue: any}> {
    const differences: Array<{key: string, currentValue: any, serverValue: any}> = [];
    
    // Check all keys in current data
    for (const key of Object.keys(currentData)) {
      // Convert to string for comparison to handle different types correctly
      const currentValue = currentData[key] !== undefined ? currentData[key] : '';
      const serverValue = serverData[key] !== undefined ? serverData[key] : '';
      
      // Compare as strings to handle different types
      const currentValueStr = String(currentValue);
      const serverValueStr = String(serverValue);
      
      if (currentValueStr !== serverValueStr) {
        differences.push({
          key,
          currentValue,
          serverValue
        });
      }
    }
    
    // Check for keys in server data that are not in current data
    for (const key of Object.keys(serverData)) {
      if (!(key in currentData)) {
        differences.push({
          key,
          currentValue: undefined,
          serverValue: serverData[key]
        });
      }
    }
    
    return differences;
  }

  /**
   * Simplified update logic for handling server data
   * This ensures client data always takes precedence over server data
   */
  updateLocalFormDataFromServer(serverFormData: Record<string, any>): void {
    if (!serverFormData || typeof serverFormData !== 'object') {
      return;
    }
    
    // Normalize server data (convert nulls to empty strings)
    const normalizedServerData = Object.fromEntries(
      Object.entries(serverFormData).map(([key, value]) => [key, value === null ? '' : value])
    );
    
    // Get the current client data
    const clientData = this.formData;
    
    // Create result data - start with a copy of client data
    const resultData = { ...clientData };
    
    // Apply server values, but only if they don't conflict with client changes
    // This is the key to preserving user input during rapid typing
    Object.keys(normalizedServerData).forEach(key => {
      const serverValue = normalizedServerData[key];
      const clientValue = clientData[key];
      
      // Always need to compare as strings for consistent behavior
      const serverValueStr = String(serverValue);
      const clientValueStr = String(clientValue);
      
      // If we have a value and it differs from server, preserve the client value
      if (clientValue !== undefined && serverValueStr !== clientValueStr) {
        // Keep client value since it represents the current UI state
        resultData[key] = clientValue;
      } else {
        // No conflict - update with server value
        resultData[key] = serverValue;
      }
    });
    
    // Update the local form data with our result data
    this.formData = resultData;
    
    // Also update the values in the fields array and sections for UI consistency
    this.fields = this.fields.map(field => 
      resultData.hasOwnProperty(field.key) 
        ? { ...field, value: resultData[field.key] } 
        : field
    );
    
    this.sections = this.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => 
        resultData.hasOwnProperty(field.key) 
          ? { ...field, value: resultData[field.key] } 
          : field
      )
    }));
    
    // Store the last saved data reference for future comparisons
    this.lastSavedData = JSON.stringify(normalizedServerData);
  }

  /**
   * Calculate appropriate task status based on current progress
   * @param isSubmitted Whether the form has been submitted
   * @returns The appropriate task status
   */
  calculateTaskStatus(isSubmitted: boolean = false): string {
    const progress = this.calculateProgress();
    
    // Calculate the new status based on progress
    const calculatedStatus = calculateTaskStatusUtil(progress, isSubmitted);
    
    // Store the calculated status for future reference
    this.taskStatus = calculatedStatus;
    
    console.log(`[KybService] Calculated task status: ${calculatedStatus} based on progress ${progress}%`);
    return calculatedStatus;
  }

  // Track pending save operations to prevent race conditions
  // Write buffer to ensure we're always saving the latest data
  private writeBuffer: Record<string, any> = {};
  private isSaving = false;
  private saveDebounceMs = 500; // Delay saves by 500ms to allow for rapid typing

  /**
   * Simplified saving logic that's more reliable for rapid user input
   * This uses a write buffer to ensure we always save the most recent data
   */
  async saveProgress(taskId?: number): Promise<void> {
    if (!taskId) {
      console.error('Task ID is required to save progress');
      return;
    }
    
    // Always update the write buffer with the latest data
    // This way, even if multiple saves are triggered, the latest data is always used
    this.writeBuffer = {...this.formData};
    
    // Clear any existing timer to prevent multiple save operations
    if (this.saveProgressTimer) {
      clearTimeout(this.saveProgressTimer);
      this.saveProgressTimer = null;
    }
    
    // Schedule a new save operation after a short delay
    // This allows for batching rapid changes, improving performance and reliability
    this.saveProgressTimer = setTimeout(async () => {
      // If already saving, the next save operation will pick up the latest data from writeBuffer
      if (this.isSaving) {
        return;
      }
      
      this.isSaving = true;
      
      let dataToSave: Record<string, any> = {};
      
      try {
        // Use the data from our write buffer to ensure we save the most recent changes
        dataToSave = {...this.writeBuffer};
        
        // Calculate progress and status
        const progress = this.calculateProgress();
        const status = this.calculateTaskStatus();
        
        console.log(`[FORM DEBUG] Executing save with status: ${status}, progress: ${progress}%`);
        
        // Save the data
        const result = await this.saveKybProgress(taskId, progress, dataToSave, status);
        
        if (result && result.success) {
          // Store the last saved data for change detection
          this.lastSavedData = JSON.stringify(dataToSave);
          
          // Basic verification - if server data doesn't match what we sent
          if (result.savedData && result.savedData.formData) {
            const differences = this.compareFormData(dataToSave, result.savedData.formData);
            if (differences.length > 0) {
              console.log(`[FORM DEBUG] Detected ${differences.length} field differences from server response`);
            }
          }
          
          console.log(`[FORM DEBUG] ✅ Save completed successfully - progress: ${progress}%`);
        } else {
          console.error('Save failed:', result?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Exception during save:', error);
      } finally {
        this.isSaving = false;
        
        // Check if write buffer changed during save - if so, save again
        const currentBufferData = JSON.stringify(this.writeBuffer);
        const savedData = JSON.stringify(dataToSave);
        
        if (currentBufferData !== savedData) {
          this.saveProgress(taskId);
        }
      }
    }, this.saveDebounceMs);
  }

  /**
   * Save KYB progress to the server
   * Clean implementation with proper error handling and efficient request processing
   */
  async saveKybProgress(taskId: number, progress: number, formData: Record<string, any>, status?: string) {
    try {
      // Check if taskId is provided
      if (!taskId) {
        console.error('Missing taskId in saveKybProgress');
        return {
          success: false,
          error: 'Task ID is required'
        };
      }
      
      // Normalize form data before sending to server (remove null values)
      const normalizedFormData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value === null ? '' : value])
      );
      
      // Send the minimum necessary data to reduce payload size
      const response = await fetch(`/api/kyb/progress`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          progress,
          status: status || undefined,
          formData: normalizedFormData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error saving form data: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to save: ${response.status}`
        };
      }
      
      // Parse response and handle success
      const responseText = await response.text();
      let responseData;
      
      try {
        // Handle empty response
        if (!responseText || responseText.trim() === '') {
          responseData = { success: true };
        } else {
          try {
            responseData = JSON.parse(responseText);
            
            // If the server returned savedData with formData, update our local form data
            if (responseData.savedData && responseData.savedData.formData) {
              this.updateLocalFormDataFromServer(responseData.savedData.formData);
            }
          } catch (jsonError) {
            // If the response isn't valid JSON but status was OK, assume success
            if (response.status >= 200 && response.status < 300) {
              responseData = { success: true };
            } else {
              throw jsonError;
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing save response:', parseError);
        
        // Still assume success if we received a 2xx OK status
        if (response.status >= 200 && response.status < 300) {
          responseData = { success: true }; 
        } else {
          responseData = { 
            success: false,
            error: `Error processing server response: ${response.status}` 
          };
        }
      }
      
      return responseData;
    } catch (error) {
      console.error('Network error while saving form data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get KYB progress from the server
   * Clean implementation with proper error handling and minimal logging
   */
  async getKybProgress(taskId: number): Promise<KybProgressResponse> {
    try {
      // Make a query to get progress data
      const response = await fetch(`/api/kyb/progress/${taskId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Error loading form data: ${response.status}`);
        return { formData: {}, progress: 0 };
      }
      
      // Check for empty response before parsing
      const text = await response.text();
      if (!text || text.trim() === '') {
        return { formData: {}, progress: 0 };
      }
      
      // Safely parse the JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        // If we get an error parsing, return a default object
        return { formData: {}, progress: 0 };
      }
      
      // Save the loaded data as the "last saved" for change detection
      // This prevents unnecessary API calls if the data hasn't changed
      if (data.formData) {
        this.lastSavedData = JSON.stringify(data.formData);
        
        // Ensure all values are non-null (null can cause controlled/uncontrolled input warnings)
        const normalizedFormData = Object.fromEntries(
          Object.entries(data.formData).map(([key, value]) => [key, value === null ? '' : value])
        );
        
        return {
          formData: normalizedFormData,
          progress: data.progress || 0,
          status: data.status
        };
      }
      
      return {
        formData: data.formData || {},
        progress: data.progress || 0,
        status: data.status
      };
    } catch (error) {
      console.error('Network error while loading form data:', error);
      return { formData: {}, progress: 0 };
    }
  }

  /**
   * Reset data by fetching fresh data from the server
   * This is useful for the demo autofill functionality
   */
  async resetData(): Promise<void> {
    this.logger.info('Resetting form service data');
    // Clear the current form data
    this.formData = {};
    // Clear write buffer to prevent any pending saves
    this.writeBuffer = {};
    this.lastSavedData = '';
    
    // If we have a task ID, immediately load fresh data
    if (this.currentTaskId) {
      try {
        this.logger.info(`Reloading fresh data for task ${this.currentTaskId}`);
        const progressData = await this.getKybProgress(this.currentTaskId);
        if (progressData && progressData.formData) {
          // Directly load data without merging with existing (since we cleared it)
          this.loadFormData(progressData.formData);
          this.logger.info(`Successfully reloaded data with ${Object.keys(progressData.formData).length} fields`);
        }
      } catch (error) {
        this.logger.error('Error reloading data during reset:', error);
      }
    }
  }
  
  /**
   * Update a single field value
   */
  async updateField(fieldKey: string, value: any): Promise<void> {
    this.logger.info(`Updating field ${fieldKey} with new value`);
    // Update the field in our form data
    this.formData[fieldKey] = value;
    
    // Update the field in our fields array
    this.fields = this.fields.map(field => 
      field.key === fieldKey ? { ...field, value } : field
    );
    
    // Update the field in all sections
    this.sections = this.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => 
        field.key === fieldKey ? { ...field, value } : field
      )
    }));
  }

  /**
   * Load saved progress for a task
   */
  async loadProgress(taskId: number): Promise<Record<string, any>> {
    try {
      // Store the task ID for resetData method
      this.currentTaskId = taskId;
      
      // Get current form data before loading - we'll use this if the API call fails
      const currentFormData = this.formData;
      
      // Get progress data from the server
      const progressData = await this.getKybProgress(taskId);
      const { formData, status } = progressData;
      
      // Store the server-provided status if available
      if (status) {
        this.taskStatus = status;
      }
      
      // If no data was returned but we have existing data, keep the current data
      if (!formData || Object.keys(formData).length === 0) {
        if (Object.keys(currentFormData).length > 0) {
          return currentFormData;
        }
        
        this.loadFormData({});
        return {};
      }

      // Use our method for consistent handling of form data updates
      this.updateLocalFormDataFromServer(formData);
      
      return this.formData;
    } catch (error) {
      console.error(`Error loading progress for task ${taskId}:`, error);
      
      // If we already have data, keep it
      if (Object.keys(this.formData).length > 0) {
        return this.formData;
      }
      
      // Fall back to empty object
      this.loadFormData({});
      return {};
    }
  }

  /**
   * Save the form
   */
  async save(options: FormSubmitOptions): Promise<boolean> {
    if (!options.taskId) {
      throw new Error('Task ID is required to save the form');
    }
    
    try {
      // Save progress using the simple method
      await this.saveProgress(options.taskId);
      return true;
    } catch (error) {
      console.error('Error saving form:', error);
      return false;
    }
  }

  /**
   * Submit the completed form
   */
  async submit(options: FormSubmitOptions): Promise<any> {
    if (!options.taskId) {
      throw new Error('Task ID is required to submit the form');
    }
    
    try {
      // Update task status to 'submitted' when form is being submitted
      this.taskStatus = 'submitted';
      
      // Send the form submission to the server
      const result = await this.submitKybForm(options.taskId, this.formData, options.fileName);
      
      // After successful submission, ensure status is set to 'submitted'
      if (result && result.success) {
        this.taskStatus = 'submitted';
        console.log('[KybService] Form submitted successfully, status updated to "submitted"');
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  }

  /**
   * Submit the KYB form to the server
   * Includes taskId in request body for proper server processing
   */
  async submitKybForm(taskId: number, formData: Record<string, any>, fileName?: string) {
    try {
      if (!taskId) {
        throw new Error('Task ID is required to submit the form');
      }
      
      // Use consistent pattern with other API calls
      console.log(`[KybService] Submitting form to /api/kyb/save with fileName: ${fileName}`);
      console.log(`[KybService] Task ID: ${taskId}, Form data has ${Object.keys(formData).length} fields`);
      
      const response = await fetch(`/api/kyb/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          taskId,       // Include taskId in the request
          formData,
          fileName,
          status: 'submitted' // Always include submitted status for form submissions
        })
      });
      
      // Get response text first for proper error handling
      const responseText = await response.text();
      
      // Debug: log response status and text
      console.log(`[KybService] Server response status: ${response.status}`);
      console.log(`[KybService] Response text length: ${responseText.length}`);
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        console.error('[KybService] Server returned an empty response');
        throw new Error('Server returned an empty response');
      }
      
      // Parse response text to JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('[KybService] Successfully parsed JSON response:', responseData);
      } catch (parseError) {
        console.error('[KybService] Failed to parse response as JSON', parseError, responseText.substring(0, 200));
        throw new Error('Server returned an invalid response format. Please try again.');
      }
      
      // Check if response indicates an error with 207 status (partial success)
      if (response.status === 207) {
        console.warn('[KybService] Received partial success response:', responseData);
        if (responseData.error) {
          // Include both error and details in the message for better user feedback
          const errorMessage = responseData.details 
            ? `${responseData.error}: ${responseData.details}` 
            : responseData.error;
          throw new Error(errorMessage);
        }
      }
      
      // Check if response is not OK
      if (!response.ok) {
        console.error('[KybService] Response not OK:', response.status, responseData);
        throw new Error(responseData.details || responseData.error || `Failed to submit form: ${response.status}`);
      }
      
      // Check if response contains explicit error field
      if (responseData.error) {
        console.error('[KybService] Response contains error field:', responseData.error);
        throw new Error(responseData.details || responseData.error);
      }
      
      // Make sure response has success flag
      if (!responseData.success) {
        console.error('[KybService] Response missing success flag:', responseData);
        throw new Error('Submission incomplete. Please check your form data and try again.');
      }
      
      // Return validated response data
      return responseData;
    } catch (error) {
      console.error('[KybService] Error submitting form:', error);
      throw error;
    }
  }

  /**
   * Synchronize form data between task.savedFormData and individual field responses
   * This prevents inconsistencies when navigating between forms
   * @param taskId The task ID to synchronize
   * @returns Promise<SyncFormDataResponse> The synchronized form data
   */
  async syncFormData(taskId: number): Promise<SyncFormDataResponse> {
    try {
      // Check if taskId is provided
      if (!taskId) {
        console.error('[FormSync] Missing taskId in syncFormData');
        throw new Error('Task ID is required');
      }
      
      console.debug(`[FormSync] Synchronizing form data for task: ${taskId}`);
      
      // Call the synchronization endpoint
      const response = await fetch(`/api/tasks/${taskId}/sync-form-data`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FormSync] Error synchronizing form data: ${errorText}`);
        throw new Error(`Failed to synchronize form data: ${response.status} ${response.statusText}`);
      }
      
      // Parse response
      const result = await response.json();
      
      // Update local form data if data was synchronized
      if (result.success && result.formData && result.syncDirection !== 'none') {
        console.debug(`[FormSync] Updating local form data with synchronized data (direction: ${result.syncDirection})`);
        this.loadFormData(result.formData);
      } else {
        console.debug(`[FormSync] No synchronization needed (direction: ${result.syncDirection})`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[FormSync] Error in syncFormData: ${errorMessage}`);
      
      // Return a failed response
      return {
        success: false,
        formData: {},
        progress: 0,
        status: 'error',
        taskId,
        syncDirection: 'none'
      };
    }
  }

  /**
   * Validate form data
   */
  validate(data: FormData): boolean | Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const field of this.fields) {
      const { key, validation, label } = field;
      const value = data[key];
      
      // Skip fields without validation rules
      if (!validation) continue;
      
      // Required validation
      if (validation.required && (value === undefined || value === null || value === '')) {
        errors[key] = `${label} is required`;
        continue;
      }
      
      // Skip further validation for empty optional fields
      if (value === undefined || value === null || value === '') continue;
      
      // String validations
      if (typeof value === 'string') {
        // Min length validation
        if (validation.minLength !== undefined && value.length < validation.minLength) {
          errors[key] = `${label} must be at least ${validation.minLength} characters`;
          continue;
        }
        
        // Max length validation
        if (validation.maxLength !== undefined && value.length > validation.maxLength) {
          errors[key] = `${label} must be at most ${validation.maxLength} characters`;
          continue;
        }
        
        // Pattern validation
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          errors[key] = validation.message || `${label} has an invalid format`;
          continue;
        }
      }
      
      // Number validations
      if (typeof value === 'number') {
        // Min value validation
        if (validation.min !== undefined && value < validation.min) {
          errors[key] = `${label} must be at least ${validation.min}`;
          continue;
        }
        
        // Max value validation
        if (validation.max !== undefined && value > validation.max) {
          errors[key] = `${label} must be at most ${validation.max}`;
          continue;
        }
      }
    }
    
    // Return true if no errors, otherwise return the errors object
    return Object.keys(errors).length === 0 ? true : errors;
  }
}

// Export a singleton instance of the KYB form service
export const kybService = new KybFormService();

// Export convenience functions
export const getKybFields = (): Promise<KybField[]> => kybService.getKybFields();
export const getKybFieldsByStepIndex = (stepIndex: number): Promise<KybField[]> => kybService.getKybFieldsByStepIndex(stepIndex);
export const groupKybFieldsBySection = (fields: KybField[]): Record<string, KybField[]> => kybService.groupFieldsBySection(fields);
export const saveKybProgress = (taskId: number, progress: number, formData: Record<string, any>, status?: string) => kybService.saveKybProgress(taskId, progress, formData, status);
export const getKybProgress = (taskId: number): Promise<KybProgressResponse> => kybService.getKybProgress(taskId);
export const submitKybForm = (taskId: number, formData: Record<string, any>, fileName?: string) => kybService.submitKybForm(taskId, formData, fileName);
export const getTaskStatus = (): string => kybService.getTaskStatus();
export const syncKybFormData = (taskId: number): Promise<SyncFormDataResponse> => kybService.syncFormData(taskId);