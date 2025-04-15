import { FormData, FormField, FormSection, FormServiceInterface, FormSubmitOptions } from './formService';
import { getFieldComponentType } from '../utils/formUtils';
import getLogger from '../utils/logger';

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
      section: sectionId // Assign the section ID to the field
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
   */
  updateFormData(fieldKey: string, value: any): void {
    // Log the update attempt for debugging
    console.log(`[DEBUG KybService] Field update: ${fieldKey} = ${value !== undefined && value !== null ? 
      (typeof value === 'object' ? JSON.stringify(value) : value) : 'empty'}`);
    console.log(`[DEBUG KybService] Current form data before update has ${Object.keys(this.formData).length} fields`);
    
    // Store the old value for reference
    const oldValue = this.formData[fieldKey];
    
    // Normalize value - handle null, undefined, and empty values properly
    // This is critical for proper form field updates
    // Empty string is a valid value that should be stored and saved to database
    const normalizedValue = (value === null || value === undefined) ? '' : value;
    
    // Track if the field previously had a value but is now being cleared
    const isClearing = (oldValue !== undefined && oldValue !== null && oldValue !== '') && 
                       (normalizedValue === '' || normalizedValue === null);
    
    if (isClearing) {
      console.log(`[DEBUG KybService] Clearing field ${fieldKey} from "${oldValue}" to empty value`);
    }
    
    // More accurate change detection - convert to strings to ensure proper comparison
    // But preserve type for actual storage
    const oldValueStr = oldValue !== undefined ? String(oldValue) : '';
    const newValueStr = normalizedValue !== undefined ? String(normalizedValue) : '';
    
    // Use string comparison to detect changes, but always update when clearing a field
    if (oldValueStr === newValueStr && oldValue !== undefined && !isClearing) {
      console.log(`[DEBUG KybService] Skipping update - value unchanged for field ${fieldKey}`);
      return; // Value hasn't changed, no need to update
    }
    
    // Always update the value in the internal formData object
    this.formData[fieldKey] = normalizedValue;
    
    // Improved debug logging with type info
    console.log(`[DEBUG KybService] Updated field ${fieldKey} from "${oldValue || ''}" (${typeof oldValue}) to "${normalizedValue || ''}" (${typeof normalizedValue})`);
    
    // Verify the update happened
    console.log(`[DEBUG KybService] Form data after update has ${Object.keys(this.formData).length} fields`);
    console.log(`[DEBUG KybService] Form data now contains key ${fieldKey} with value: ${this.formData[fieldKey]}`);
    
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
    
    // Log summary of update
    console.log(`[DEBUG KybService] Form data after update has ${Object.keys(this.formData).length} fields`);
    console.log(`[DEBUG KybService] Form data now contains key ${fieldKey} with value:`, this.formData[fieldKey]);
  }

  /**
   * Get current form data
   */
  getFormData(): Record<string, any> {
    return this.formData;
  }

  /**
   * Calculate form completion progress
   */
  calculateProgress(): number {
    const requiredFields = this.fields.filter(field => field.required);
    if (requiredFields.length === 0) return 100;
    
    const filledRequiredFields = requiredFields.filter(field => {
      const value = this.formData[field.key];
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((filledRequiredFields.length / requiredFields.length) * 100);
  }

  /**
   * Save form progress with improved debouncing and change detection
   */
  async saveProgress(taskId?: number): Promise<void> {
    if (!taskId) {
      console.error("Task ID is required to save progress");
      return;
    }
    
    // Get current form data JSON
    const currentDataString = JSON.stringify(this.formData);
    
    // Debug logging to track data changes
    console.log(`[DEBUG KybService] Current form data: ${Object.keys(this.formData).length} fields`);
    
    if (this.lastSavedData) {
      try {
        const previousData = JSON.parse(this.lastSavedData);
        
        // Debug - Find changed fields with more robust comparison
        const changedFields = Object.keys(this.formData).filter(key => {
          // Convert to string for comparison to handle different types correctly
          const prevValue = previousData[key] !== undefined ? String(previousData[key]) : '';
          const newValue = this.formData[key] !== undefined ? String(this.formData[key]) : '';
          
          // Check if the values are different
          return prevValue !== newValue;
        });
        
        // Log changes for debugging
        if (changedFields.length > 0) {
          console.log(`[DEBUG KybService] Changed fields: ${changedFields.join(', ')}`);
          changedFields.forEach(field => {
            console.log(`[DEBUG KybService] Field [${field}] changed from "${previousData[field] || ''}" to "${this.formData[field] || ''}"`);
          });
        } else {
          // If no changes detected but JSON strings are different
          if (currentDataString !== this.lastSavedData) {
            console.log('[DEBUG KybService] JSON strings differ but no field changes detected - forcing save');
          } else {
            console.log('[DEBUG KybService] No fields have changed values');
          }
        }
      } catch (err) {
        console.error('[DEBUG KybService] Error comparing data changes:', err);
      }
    }
    
    // Force a save if lastSavedData is empty (first save) or if the data has changed
    if (!this.lastSavedData || currentDataString !== this.lastSavedData) {
      // Clear any existing timer
      if (this.saveProgressTimer) {
        clearTimeout(this.saveProgressTimer);
        this.saveProgressTimer = null;
      }
      
      // Set a new timer for debouncing (800ms)
      this.saveProgressTimer = setTimeout(async () => {
        try {
          console.log(`[KybService] Saving ${Object.keys(this.formData).length} fields to database...`);
          const progress = this.calculateProgress();
          
          // Save to server first, only update lastSavedData if successful
          const result = await this.saveKybProgress(taskId, progress, this.formData);
          
          // Only update lastSavedData if the save was successful
          if (result && result.success) {
            // Update last saved data reference AFTER successful save
            this.lastSavedData = currentDataString;
            console.log(`[KybService] Successfully saved progress (${progress}%) with ${Object.keys(this.formData).length} fields`);
          } else {
            console.error('[KybService] Failed to save progress:', result?.error || 'Unknown error');
          }
        } catch (error) {
          console.error('[KybService] Error saving progress:', error);
          // Silent failure to allow user to continue working
        }
      }, 800);
    } else {
      console.log('[KybService] Skipping save - data unchanged');
    }
  }

  /**
   * Save KYB progress to the server
   * Clean implementation with proper error handling and efficient request processing
   */
  async saveKybProgress(taskId: number, progress: number, formData: Record<string, any>) {
    try {
      // Check if taskId is provided
      if (!taskId) {
        console.error('[KybService] Missing taskId in saveKybProgress');
        return {
          success: false,
          error: 'Task ID is required'
        };
      }
      
      console.log(`[KybService] Saving progress for task ID: ${taskId}, progress: ${progress}, fields: ${Object.keys(formData).length}`);
      
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
          taskId,  // Essential - Include taskId in the request body
          progress,
          formData: normalizedFormData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[KybService] Error saving form data: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to save: ${response.status}`
        };
      }
      
      // Parse response and handle success
      const responseText = await response.text();
      let responseData;
      
      try {
        // Log response for debugging if empty
        if (!responseText || responseText.trim() === '') {
          console.log('[KybService] Empty response from server when saving progress (this may be normal)');
          responseData = { success: true };
        } else {
          responseData = JSON.parse(responseText);
          console.log(`[KybService] Successfully saved progress for task ${taskId}`);
        }
      } catch (parseError) {
        console.error('[KybService] Error parsing save response:', parseError);
        console.error('[KybService] Raw response:', responseText.substring(0, 200));
        responseData = { success: true }; // Assume success if we received a 200 OK
      }
      
      return responseData;
    } catch (error) {
      console.error('[KybService] Network error while saving form data:', error);
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
      console.log(`[KybService] Getting progress data for task ID: ${taskId}`);
      
      // Make a query to get progress data, using taskId as a path parameter
      // Fix the URL path to match the server endpoint
      const response = await fetch(`/api/kyb/progress/${taskId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`[KybService] Error loading form data: ${response.status}`);
        return { formData: {}, progress: 0 };
      }
      
      // Check for empty response before parsing
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn('[KybService] Empty response received from server');
        return { formData: {}, progress: 0 };
      }
      
      // Safely parse the JSON
      let data;
      try {
        // Log the raw response text for debugging
        console.log(`[KybService] Raw response:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        
        // Handle empty responses by returning a default object
        if (!text || text.trim() === '') {
          console.warn('[KybService] Empty JSON response, using default empty object');
          data = { formData: {}, progress: 0 };
        } else {
          data = JSON.parse(text);
          console.log(`[KybService] Successfully parsed progress data:`, data);
        }
      } catch (parseError) {
        console.error('[KybService] Error parsing JSON response:', parseError);
        console.error('[KybService] Raw response that failed to parse:', text.substring(0, 200));
        
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
        
        console.log(`[KybService] Normalized form data with ${Object.keys(normalizedFormData).length} fields`);
        
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
      console.error('[KybService] Network error while loading form data:', error);
      return { formData: {}, progress: 0 };
    }
  }

  /**
   * Load saved progress for a task
   */
  async loadProgress(taskId: number): Promise<Record<string, any>> {
    try {
      console.log(`[DEBUG KybService] Loading progress for task ID: ${taskId}`);
      
      // Get current form data before loading - we'll use this if the API call fails
      const currentFormData = this.formData;
      
      // Get progress data from the server
      const progressData = await this.getKybProgress(taskId);
      const { formData } = progressData;
      
      // If no data was returned but we have existing data, keep the current data
      if (!formData || Object.keys(formData).length === 0) {
        console.log('[DEBUG KybService] No saved data found or empty data object received');
        if (Object.keys(currentFormData).length > 0) {
          console.log(`[DEBUG KybService] Using existing form data with ${Object.keys(currentFormData).length} fields`);
          return currentFormData;
        }
        
        console.log('[DEBUG KybService] No existing form data, using empty object');
        this.loadFormData({});
        return {};
      }
      
      // Normalize form data to prevent null values (causing controlled/uncontrolled input warnings)
      const normalizedFormData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value === null ? '' : value])
      );
      
      console.log(`[DEBUG KybService] For already initialized service - loaded saved data:`, normalizedFormData);
      
      // Load the normalized form data
      this.loadFormData(normalizedFormData);
      return normalizedFormData;
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
      return await this.submitKybForm(options.taskId, this.formData, options.fileName);
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
      console.log(`[DEBUG KybService] submitting form to /api/kyb/save with fileName: ${fileName}`);
      
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
          fileName
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit form: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[KybService] Error submitting form:', error);
      throw error;
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
export const saveKybProgress = (taskId: number, progress: number, formData: Record<string, any>) => kybService.saveKybProgress(taskId, progress, formData);
export const getKybProgress = (taskId: number): Promise<KybProgressResponse> => kybService.getKybProgress(taskId);
export const submitKybForm = (taskId: number, formData: Record<string, any>, fileName?: string) => kybService.submitKybForm(taskId, formData, fileName);