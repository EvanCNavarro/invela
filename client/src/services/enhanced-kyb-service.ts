/**
 * ========================================
 * Enhanced KYB Service - Know Your Business Enterprise Solution
 * ========================================
 * 
 * Advanced Know Your Business (KYB) service providing comprehensive customer
 * business verification and due diligence capabilities. Manages complex form
 * workflows, field-level timestamping, and real-time data synchronization.
 * 
 * Key Features:
 * - Enhanced form field management with timestamped data integrity
 * - Progressive optimization and performance monitoring
 * - Advanced conflict resolution for multi-user editing
 * - Real-time form synchronization and validation
 * - Comprehensive field mapping and type conversion
 * 
 * Business Verification Capabilities:
 * - Corporate structure and ownership verification
 * - Financial standing and compliance assessment
 * - Risk scoring and regulatory compliance checking
 * - Document validation and authentication
 * - Real-time field-level timestamp synchronization
 * 
 * @module services/enhanced-kyb-service
 * @version 1.0.0
 * @since 2025-05-23
 */

import { FormServiceInterface, FormSubmitOptions, FormSubmitResponse } from './form-service.interface';
import { FormData, TimestampedFormData, createTimestampedFormData, updateField, mergeTimestampedFormData, extractValues, getNewerClientFields } from '../types/form-data';
import { FormField, FormSection } from '../components/forms/types';
import { calculateTaskStatusUtil } from '../utils/form-utils';
import getLogger from '../utils/logger';
import { OptimizationFeatures, progressiveLoader, performanceMonitor, safelyRunOptimizedCode } from '../utils/form-optimization';

// Import a function to convert database field types to component types
function getFieldComponentType(fieldType: string): string {
  const typeMap: Record<string, string> = {
    'text': 'text',
    'textarea': 'textarea',
    'date': 'date',
    'select': 'select',
    'radio': 'radio',
    'checkbox': 'checkbox',
    'email': 'email',
    'tel': 'tel',
    'number': 'number',
    'file': 'file',
    'boolean': 'boolean'
  };
  
  return typeMap[fieldType] || fieldType || 'text'; // Default to text if type not found
}

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
  timestamps?: Record<string, number>;
  progress: number;
  status?: string;
}

/**
 * Enhanced KYB Form Service with field-level timestamp tracking
 * For reliable conflict resolution and data integrity
 */
export class EnhancedKybFormService implements FormServiceInterface {
  private fields: FormField[] = [];
  private sections: FormSection[] = [];
  private timestampedFormData: TimestampedFormData = createTimestampedFormData();
  private initialized = false;
  private templateId: number | null = null;
  private taskStatus: string = 'not_started';
  
  private saveProgressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSavedData: string = '';
  private logger = getLogger('Enhanced KYB Service');
  private debugMode = process.env.NODE_ENV === 'development';
  
  private static fieldsCache: Record<number, KybField[]> = {};
  
  constructor() {
    this.logger.info('Enhanced KYB Form Service initialized with timestamp tracking');
  }
  
  /**
   * Set the active section for progressive loading
   * @param sectionId ID of the active section
   */
  setActiveSection(sectionId: string): void {
    if (!OptimizationFeatures.PROGRESSIVE_LOADING) {
      return;
    }
    
    // Start performance tracking
    performanceMonitor.startTimer('setActiveSection');
    
    // Update the progressive loader with the new active section
    if (progressiveLoader.getLoadingStats().length > 0) {
      this.logger.info(`Setting active section to: ${sectionId}`);
      progressiveLoader.setCurrentSection(sectionId);
    } else {
      this.logger.warn('Attempted to set active section before progressive loader was initialized');
    }
    
    // End performance tracking
    performanceMonitor.endTimer('setActiveSection');
  }
  
  /**
   * Initialize the KYB form service
   * @param templateId ID of the task template
   */
  async initialize(templateId: number): Promise<void> {
    if (this.initialized && this.templateId === templateId) {
      this.logger.info('EnhancedKybService already initialized with template:', templateId);
      return; // Already initialized with this template
    }

    try {
      this.templateId = templateId;
      this.logger.info(`EnhancedKybService initializing with template ID: ${templateId}`);
      
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
        const sectionId = `section-${order - 1}`; // Adjust to match the original logic (0-based)
        
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
      this.fields = this.sections.reduce<FormField[]>((allFields, section) => {
        return [...allFields, ...section.fields];
      }, []);
      
      // Log the created sections and field counts
      this.logger.info('Created sections:');
      this.sections.forEach(section => {
        this.logger.info(`- Section "${section.title}" with ${section.fields.length} fields (order: ${section.order})`);
      });
      
      // Verify all fields have section IDs
      const fieldsWithoutSection = this.fields.filter(field => !field.sectionId);
      if (fieldsWithoutSection.length > 0) {
        this.logger.warn(`WARNING: ${fieldsWithoutSection.length} fields don't have section IDs assigned`);
        fieldsWithoutSection.forEach(field => {
          this.logger.warn(`- Field without section: ${field.key}`);
        });
      } else {
        this.logger.info(`Success: All ${this.fields.length} fields have section IDs correctly assigned`);
      }
      
      // Create empty form data with timestamps
      this.timestampedFormData = createTimestampedFormData();
      
      this.initialized = true;
      this.logger.info('EnhancedKybFormService initialization complete.');
      
    } catch (error) {
      this.logger.error('Error initializing EnhancedKybFormService:', error);
      throw error;
    }
  }
  
  /**
   * Fetches KYB fields from the server or cache
   */
  async getKybFields(): Promise<KybField[]> {
    if (this.templateId === null) {
      throw new Error('Template ID is required');
    }
    
    // Return from cache if available
    if (EnhancedKybFormService.fieldsCache[this.templateId]) {
      return EnhancedKybFormService.fieldsCache[this.templateId];
    }
    
    try {
      // Make request to get fields
      const response = await fetch(`/api/kyb/fields?templateId=${this.templateId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KYB fields: ${response.status}`);
      }
      
      const fields = await response.json();
      
      // Cache fields for future use
      EnhancedKybFormService.fieldsCache[this.templateId] = fields;
      
      return fields;
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
    return fields.filter(field => {
      // Map section names to indices
      const sectionMap: Record<string, number> = {
        'Company Profile': 1,
        'Governance & Leadership': 2, 
        'Financial Profile': 3,
        'Operations & Compliance': 4,
        'Risk & Security': 5
      };
      
      return sectionMap[field.group] === stepIndex;
    });
  }
  
  /**
   * Group KYB fields by their section name
   */
  groupFieldsBySection(fields: KybField[]): Record<string, KybField[]> {
    // Standard section names we want to use - use a comprehensive approach
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
    
    const groups: Record<string, KybField[]> = {};
    
    // Helper function to normalize section name
    const normalizeSection = (section: string): string => {
      // Try exact match first
      if (sectionMap[section]) {
        return sectionMap[section];
      }
      
      // Try case-insensitive match
      const lowerSection = section.toLowerCase();
      if (sectionMap[lowerSection]) {
        return sectionMap[lowerSection];
      }
      
      // Return the original if no mapping exists
      return section;
    };
    
    fields.forEach(field => {
      const rawGroup = field.group || 'Other';
      const group = normalizeSection(rawGroup);
      
      this.logger.debug(`Normalized section name: "${rawGroup}" → "${group}"`);
      
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(field);
    });
    
    // Sort fields within each group by their order
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => a.order - b.order);
    });
    
    // Debug: show what sections we found
    this.logger.info(`Normalized sections (${Object.keys(groups).length}): ${Object.keys(groups).join(', ')}`);
    Object.entries(groups).forEach(([section, sectionFields]) => {
      this.logger.info(`  - ${section}: ${sectionFields.length} fields`);
    });
    
    return groups;
  }
  
  /**
   * Convert KYB field to form field format
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
      helpText: field.help_text || undefined, // Convert null to undefined
      placeholder: '',
      value: this.timestampedFormData.values[field.field_key] || '',
      section: sectionId || undefined, // Assign the section ID to the field (ensuring null -> undefined)
      sectionId: sectionId || undefined, // Also keep this for compatibility
      
      // Enhanced field guidance properties
      answerExpectation: field.answer_expectation || undefined,
      demoAutofill: field.demo_autofill || undefined,
      validationType: field.validation_type || undefined
    };
  }
  
  /**
   * Get all form fields
   * With optional progressive loading optimization
   */
  getFields(): FormField[] {
    // CRITICAL FIX: Disable progressive loading on actual form pages and in production
    // This ensures all fields are always shown on the KYB form
    if (!OptimizationFeatures.PROGRESSIVE_LOADING || window.location.pathname.includes('/task/')) {
      this.logger.info('Progressive loading disabled for this page. Returning all fields.');
      return this.fields;
    }
    
    // Use the progressive loading optimization (only for performance testing page)
    return safelyRunOptimizedCode(
      // Optimized implementation with progressive loading
      () => {
        performanceMonitor.startTimer('getFields_optimized');
        
        // Initialize the progressive loader with section information if not already done
        if (progressiveLoader.getLoadingStats().length === 0) {
          const sectionInfo = this.sections.map(section => ({
            id: section.id,
            title: section.title,
            priority: section.order
          }));
          
          this.logger.info('Initializing progressive loader with sections:', sectionInfo);
          progressiveLoader.initialize(sectionInfo);
          
          // Start loading sections in background
          progressiveLoader.startLoading(false);
        }
        
        // Don't filter by section on task pages to avoid "No fields found" issue
        if (window.location.pathname.includes('/task/')) {
          this.logger.info('Task page detected: Returning all fields for compatibility');
          return this.fields;
        }
        
        // Get the currently active section ID, if any
        const activeSectionId = progressiveLoader.getLoadingStats()
          .find(section => section.priority === 1)?.sectionId;
        
        if (activeSectionId) {
          // Return only fields for the active section plus any already loaded sections
          const loadedSectionIds = progressiveLoader.getLoadingStats()
            .filter(section => section.loaded)
            .map(section => section.sectionId);
          
          // Always include the active section, even if not fully loaded
          loadedSectionIds.push(activeSectionId);
          
          // Get fields only for loaded sections
          const visibleFields = this.fields.filter(field => 
            field.sectionId && loadedSectionIds.includes(field.sectionId)
          );
          
          performanceMonitor.endTimer('getFields_optimized');
          this.logger.info(`Progressive loading: Returning ${visibleFields.length} fields from ${loadedSectionIds.length} sections`);
          return visibleFields;
        }
        
        // Default to returning all fields if no active section
        performanceMonitor.endTimer('getFields_optimized');
        return this.fields;
      },
      // Fallback implementation (original)
      () => this.fields,
      // Error handler
      (error: Error) => {
        this.logger.error(`[EnhancedKybService] Error in getFields optimization:`, error);
      }
    );
  }
  
  /**
   * Get all form sections
   * With optional progressive loading optimization
   */
  getSections(): FormSection[] {
    // CRITICAL FIX: Disable progressive loading on actual form pages and in production
    // This ensures all sections are always shown on the KYB form
    if (!OptimizationFeatures.PROGRESSIVE_LOADING || window.location.pathname.includes('/task/')) {
      this.logger.info('Progressive loading disabled for this page. Returning all sections as fully loaded.');
      // Mark all sections as fully loaded for actual form pages
      return this.sections.map(section => ({
        ...section,
        meta: {
          ...(section.meta || {}),
          isLoaded: true,
          isLoading: false,
          priority: section.order
        }
      }));
    }
    
    // Use the progressive loading optimization (only for performance testing page)
    return safelyRunOptimizedCode(
      // Optimized implementation with progressive loading
      () => {
        performanceMonitor.startTimer('getSections_optimized');
        
        // Initialize the progressive loader with section information if not already done
        if (progressiveLoader.getLoadingStats().length === 0) {
          const sectionInfo = this.sections.map(section => ({
            id: section.id,
            title: section.title,
            priority: section.order
          }));
          
          this.logger.info('Initializing progressive loader with sections:', sectionInfo);
          progressiveLoader.initialize(sectionInfo);
          
          // Start loading sections in background
          progressiveLoader.startLoading(false);
        }
        
        // Don't filter by loading status on task pages to avoid "No fields found" issue
        if (window.location.pathname.includes('/task/')) {
          this.logger.info('Task page detected: Marking all sections as loaded');
          return this.sections.map(section => ({
            ...section,
            meta: {
              ...(section.meta || {}),
              isLoaded: true,
              isLoading: false,
              priority: section.order
            }
          }));
        }
        
        // Get all the sections, but mark 'loading' status for unloaded sections
        const sectionsWithLoadingStatus = this.sections.map(section => {
          // Check if section is loaded in the progressive loader
          const isLoaded = progressiveLoader.isSectionLoaded(section.id);
          const stats = progressiveLoader.getLoadingStats().find(s => s.sectionId === section.id);
          
          // Add loading status to section
          const priority = stats?.priority || section.order;
          const isActive = priority === 1;
          
          // Return a copy of the section with loading info
          return {
            ...section,
            meta: {
              ...(section.meta || {}),
              isLoaded: isLoaded,
              isLoading: !isLoaded && isActive,
              priority: priority
            }
          };
        });
        
        performanceMonitor.endTimer('getSections_optimized');
        
        return sectionsWithLoadingStatus;
      },
      // Fallback implementation (original)
      () => this.sections,
      // Error handler
      (error: Error) => {
        this.logger.error(`[EnhancedKybService] Error in getSections optimization:`, error);
      }
    );
  }
  
  /**
   * Load form data
   */
  loadFormData(data: Record<string, any>): void {
    // Convert to timestamped form data
    this.timestampedFormData = createTimestampedFormData(data);
  }
  
  /**
   * Update a field value with timestamp tracking
   */
  updateFormData(fieldKey: string, value: any, taskId?: number): void {
    const oldValue = this.timestampedFormData.values[fieldKey];
    
    // Skip if value hasn't changed (prevents unnecessary updates)
    if (oldValue === value) {
      // No logging for unchanged values - reduces console spam
      return;
    }
    
    // Update the field with new timestamp
    this.timestampedFormData = updateField(this.timestampedFormData, fieldKey, value);
    
    // Save progress if taskId provided and value has changed
    if (taskId) {
      // Only log major actions, not individual field updates
      if (this.debugMode) {
        this.logger.debug(`Auto-saving form after field ${fieldKey} update`);
      }
      this.saveProgress(taskId);
    }
  }
  
  /**
   * Get current form data
   */
  getFormData(): FormData {
    return extractValues(this.timestampedFormData);
  }
  
  /**
   * Get timestamped form data (for advanced conflict resolution)
   */
  getTimestampedFormData(): TimestampedFormData {
    return { ...this.timestampedFormData };
  }
  
  /**
   * Calculate form completion progress
   */
  calculateProgress(): number {
    // Check if we have fields and form data
    if (this.fields.length === 0) {
      return 0;
    }
    
    const formData = this.getFormData();
    const requiredFields = this.fields.filter(field => field.required);
    
    if (requiredFields.length === 0) {
      return 100; // No required fields means form is complete
    }
    
    // Count filled required fields
    const filledRequiredFields = requiredFields.filter(field => {
      const value = formData[field.key];
      return value !== undefined && value !== null && value !== '';
    });
    
    // Calculate progress as percentage
    const progress = Math.round((filledRequiredFields.length / requiredFields.length) * 100);
    
    return progress;
  }
  
  /**
   * Get the current task status
   */
  getTaskStatus(): string {
    return this.taskStatus;
  }
  
  /**
   * Compare two form data objects and return the differences
   */
  compareFormData(clientData: Record<string, any>, serverData: Record<string, any>): Array<{key: string, clientValue: any, serverValue: any}> {
    const differences: Array<{key: string, clientValue: any, serverValue: any}> = [];
    
    // Check all client keys against server
    Object.keys(clientData).forEach(key => {
      const clientValue = clientData[key];
      const serverValue = serverData[key];
      
      // Skip if values are equal
      if (clientValue === serverValue) {
        return;
      }
      
      // Handle case where client has a value but server has null/undefined
      if (clientValue && (serverValue === null || serverValue === undefined)) {
        differences.push({ key, clientValue, serverValue });
        return;
      }
      
      // Handle case where values differ
      if (String(clientValue) !== String(serverValue)) {
        differences.push({ key, clientValue, serverValue });
      }
    });
    
    return differences;
  }
  
  /**
   * Process server data response for timestamp conflict resolution
   */
  processServerResponse(serverData: Record<string, any>, serverTimestamps?: Record<string, number>): void {
    // If server includes timestamps, use timestamp-based conflict resolution
    if (serverTimestamps) {
      const serverTimestampedData: TimestampedFormData = {
        values: serverData,
        timestamps: serverTimestamps,
        meta: { lastSaved: Date.now() }
      };
      
      // Merge server and client data, keeping newer values
      this.timestampedFormData = mergeTimestampedFormData(
        this.timestampedFormData,
        serverTimestampedData
      );
      
      // Find fields where client data was preferred
      const newerClientFields = getNewerClientFields(this.timestampedFormData, serverTimestampedData);
      
      if (newerClientFields.length > 0) {
        console.log(`Preserved ${newerClientFields.length} client fields that were newer than server`);
      }
    } 
    // Fallback to basic conflict resolution for backward compatibility
    else {
      const normalizedServerData = Object.fromEntries(
        Object.entries(serverData).map(([key, value]) => [key, value === null ? '' : value])
      );
      
      // Current client data
      const clientData = this.getFormData();
      
      // Create result data - start with a copy of client data
      const resultData: Record<string, any> = { ...clientData };
      const timestamps: Record<string, number> = { ...this.timestampedFormData.timestamps };
      const now = Date.now();
      
      // Apply server values, but only if they don't conflict with client changes
      Object.keys(normalizedServerData).forEach(key => {
        const serverValue = normalizedServerData[key];
        const clientValue = clientData[key];
        
        // If client has a value and it differs from server, keep client value
        if (clientValue !== undefined && String(serverValue) !== String(clientValue)) {
          resultData[key] = clientValue;
          timestamps[key] = now; // Update timestamp as if this was a new change
        } else {
          // Otherwise use server value
          resultData[key] = serverValue;
          timestamps[key] = now - 1000; // Make it slightly older than client changes
        }
      });
      
      // Update form data with merged result
      this.timestampedFormData = {
        values: resultData,
        timestamps,
        meta: {
          ...this.timestampedFormData.meta,
          lastSaved: now
        }
      };
    }
  }
  
  // Track pending save operations to prevent race conditions
  private writeBuffer: TimestampedFormData | null = null;
  private isSaving = false;
  private saveDebounceMs = 500; // Delay saves by 500ms to allow for rapid typing
  
  /**
   * Enhanced saving logic with timestamp-based conflict resolution
   */
  async saveProgress(taskId?: number): Promise<void> {
    if (!taskId) {
      console.error('Task ID is required to save progress');
      return;
    }
    
    // Always update the write buffer with the latest data
    this.writeBuffer = { ...this.timestampedFormData };
    
    // Clear any existing timer to prevent multiple save operations
    if (this.saveProgressTimer) {
      clearTimeout(this.saveProgressTimer);
      this.saveProgressTimer = null;
    }
    
    // Schedule a new save operation after a short delay
    this.saveProgressTimer = setTimeout(async () => {
      // If already saving, the next save will pick up latest data from writeBuffer
      if (this.isSaving) {
        return;
      }
      
      this.isSaving = true;
      
      let dataToSave: TimestampedFormData | null = null;
      
      try {
        // Use the data from our write buffer to ensure we save the most recent changes
        if (this.writeBuffer) {
          dataToSave = { ...this.writeBuffer };
          this.writeBuffer = null;
        } else {
          dataToSave = { ...this.timestampedFormData };
        }
        
        // Calculate progress and status
        const progress = this.calculateProgress();
        const status = this.calculateTaskStatus();
        
        // Extract form values
        const formValues = extractValues(dataToSave);
        
        // Save the data with timestamps
        const result = await this.saveKybProgress(
          taskId, 
          progress, 
          formValues, 
          dataToSave.timestamps,
          status
        );
        
        if (result && result.success) {
          // Store the last saved data for change detection
          this.lastSavedData = JSON.stringify(formValues);
          
          // Process server response if it contains form data
          if (result.savedData && result.savedData.formData) {
            this.processServerResponse(
              result.savedData.formData,
              result.savedData.timestamps
            );
          }
        }
      } catch (error) {
        console.error('Exception during save:', error);
      } finally {
        this.isSaving = false;
        
        // Check if write buffer changed during save - if so, save again
        if (this.writeBuffer) {
          this.saveProgress(taskId);
        }
      }
    }, this.saveDebounceMs);
  }
  
  /**
   * Save KYB progress to the server with timestamp information
   * Uses a dual-save approach that sends both form data and timestamps
   * for deterministic conflict resolution
   */
  async saveKybProgress(
    taskId: number, 
    progress: number, 
    formData: Record<string, any>,
    timestamps: Record<string, number>,
    status?: string
  ) {
    try {
      // Check if taskId is provided
      if (!taskId) {
        console.error('Missing taskId in saveKybProgress');
        return {
          success: false,
          error: 'Task ID is required'
        };
      }
      
      // Normalize form data before sending
      const normalizedFormData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value === null ? '' : value])
      );
      
      // First, synchronize the timestamps with the server
      // This establishes a baseline for conflict resolution
      console.log(`[KYB Timestamp Sync] Saving timestamps for task ${taskId} - ${Object.keys(timestamps).length} fields`);
      
      try {
        const timestampResponse = await fetch(`/api/kyb/timestamps/${taskId}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(timestamps)
        });
        
        if (!timestampResponse.ok) {
          console.warn(`[KYB Timestamp Sync] Warning: Failed to save timestamps - ${timestampResponse.status}`);
        } else {
          console.log(`[KYB Timestamp Sync] Successfully synchronized timestamps with server`);
        }
      } catch (timestampError) {
        // Log but continue - we'll still try to save the form data
        console.warn(`[KYB Timestamp Sync] Error syncing timestamps:`, timestampError);
      }
      
      // Then send the main form data with timestamp data
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
          formData: normalizedFormData,
          timestamps // Include field timestamps
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
      if (data.formData) {
        this.lastSavedData = JSON.stringify(data.formData);
        
        // Ensure all values are non-null (null can cause controlled/uncontrolled input warnings)
        const normalizedFormData = Object.fromEntries(
          Object.entries(data.formData).map(([key, value]) => [key, value === null ? '' : value])
        );
        
        return {
          formData: normalizedFormData,
          timestamps: data.timestamps, // Include timestamps if available
          progress: data.progress || 0,
          status: data.status
        };
      }
      
      return {
        formData: data.formData || {},
        timestamps: data.timestamps,
        progress: data.progress || 0,
        status: data.status
      };
    } catch (error) {
      console.error('Network error while loading form data:', error);
      return { formData: {}, progress: 0 };
    }
  }
  
  /**
   * Load saved progress for a task with enhanced timestamp-based conflict resolution
   * 
   * This implementation includes:
   * 1. Initial form data load from /api/kyb/progress
   * 2. Dedicated timestamp fetch from /api/kyb/timestamps
   * 3. Intelligent conflict resolution between client and server state
   * 4. Graceful fallback mechanisms if any part of the process fails
   */
  async loadProgress(taskId: number): Promise<FormData> {
    try {
      // Get current form data before loading - we'll use this if the API call fails
      const currentFormData = this.getFormData();
      
      // Get progress data from the server
      const progressData = await this.getKybProgress(taskId);
      const { formData, timestamps: initialTimestamps, status } = progressData;
      
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

      // Step 2: Get dedicated timestamps from dedicated timestamp API
      // This provides a more complete and authoritative timestamp source
      let enhancedTimestamps = initialTimestamps || {};
      
      try {
        console.log(`[KYB Timestamp Sync] Loading field timestamps for task ${taskId}...`);
        const timestampResponse = await fetch(`/api/kyb/timestamps/${taskId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (timestampResponse.ok) {
          const timestampData = await timestampResponse.json();
          
          // If we got back valid timestamp data, use it for enhanced conflict resolution
          if (timestampData && typeof timestampData === 'object') {
            console.log(`[KYB Timestamp Sync] Loaded ${Object.keys(timestampData).length} field timestamps`);
            enhancedTimestamps = timestampData;
          }
        } else {
          console.warn(`[KYB Timestamp Sync] Failed to load timestamps: ${timestampResponse.status}`);
        }
      } catch (timestampError) {
        // Log but continue with the timestamps we already have
        console.warn(`[KYB Timestamp Sync] Error loading timestamps:`, timestampError);
      }
      
      // Process server response using the best available timestamps
      this.processServerResponse(formData, enhancedTimestamps);
      
      // Log a summary of the data loaded
      console.log(`[KYB Form Data] Loaded ${Object.keys(formData).length} fields with ${Object.keys(enhancedTimestamps).length} timestamps for task ${taskId}`);
      
      return this.getFormData();
    } catch (error) {
      console.error(`Error loading progress for task ${taskId}:`, error);
      
      // If we already have data, keep it
      if (Object.keys(this.getFormData()).length > 0) {
        return this.getFormData();
      }
      
      // Fall back to empty object
      this.loadFormData({});
      return {};
    }
  }
  
  /**
   * Bulk update multiple form fields at once
   * Used primarily for demo auto-fill functionality
   * @param data Record of field keys and values to update
   * @param taskId Optional task ID for immediate persistence
   * @returns Promise resolving to a boolean indicating success
   */
  public async bulkUpdate(data: Record<string, any>, taskId?: number): Promise<boolean> {
    if (!taskId) {
      throw new Error('No task ID provided for bulk update');
    }
    
    try {
      this.logger.info(`[Enhanced KYB Service] Performing bulk update for task ${taskId}`);
      
      // First update the local form data
      Object.entries(data).forEach(([key, value]) => {
        this.updateFormData(key, value);
      });
      
      // Then send to server with proper payload format including 'responses' wrapper
      const response = await fetch(`/api/kyb/bulk-update/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          responses: data
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`[Enhanced KYB Service] Failed to perform bulk update: ${response.status}`, errorText);
        return false;
      }
      
      this.logger.info(`[Enhanced KYB Service] Bulk update successful for task ${taskId}`);
      return true;
    } catch (error) {
      this.logger.error('[Enhanced KYB Service] Error during bulk update:', error);
      return false;
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
  async submit(options: FormSubmitOptions): Promise<FormSubmitResponse> {
    if (!options.taskId) {
      throw new Error('Task ID is required to submit the form');
    }
    
    try {
      console.log('[Form Submission] Starting form submission process for task ID:', options.taskId);
      
      // Update task status to 'submitted' when form is being submitted
      this.taskStatus = 'submitted';
      
      // Get form values
      const formValues = this.getFormData();
      
      // Send the form submission to the server
      console.log('[Form Submission] Calling submitKybForm for task ID:', options.taskId);
      const result = await this.submitKybForm(
        options.taskId, 
        formValues,
        options.fileName
      );
      
      // After successful submission, ensure status is set to 'submitted'
      if (result && result.success) {
        console.log('[Form Submission] Form submitted successfully, updating task status to submitted');
        this.taskStatus = 'submitted';
        
        // As a fallback, manually trigger a WebSocket submission event
        try {
          // Import and use the WebSocket service directly
          const { wsService } = await import('./websocket-unified');
          
          console.log('[Form Submission] Emitting local submission_status event as fallback');
          // Send local websocket event with a small delay to let the server event arrive first
          setTimeout(() => {
            wsService.emit('submission_status', {
              taskId: options.taskId,
              status: 'submitted',
              timestamp: Date.now(),
              source: 'client-fallback'
            }).catch(err => {
              console.error('[Form Submission] Error emitting fallback event:', err);
            });
          }, 1000);
        } catch (wsError) {
          console.error('[Form Submission] Error with WebSocket fallback:', wsError);
        }
      }
      
      return result;
    } catch (error) {
      console.error('[Form Submission] Error submitting form:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Submit the KYB form to the server
   */
  async submitKybForm(
    taskId: number, 
    formData: Record<string, any>, 
    fileName?: string
  ): Promise<FormSubmitResponse> {
    try {
      if (!taskId) {
        throw new Error('Task ID is required to submit the form');
      }
      
      // Get timestamps
      const timestamps = this.timestampedFormData.timestamps;
      
      // FIXED: Use the standardized endpoint format like other form types
      const response = await fetch(`/api/tasks/${taskId}/kyb-submit`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          formData,
          timestamps, // Include timestamps for conflict resolution
          fileName,
          status: 'submitted'
        })
      });
      
      // Get response text first for proper error handling
      const responseText = await response.text();
      
      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        throw new Error('Server returned an empty response');
      }
      
      // Parse response text to JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned an invalid response format. Please try again.');
      }
      
      // Check if response indicates an error with 207 status (partial success)
      if (response.status === 207) {
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
        throw new Error(responseData.details || responseData.error || `Failed to submit form: ${response.status}`);
      }
      
      // Check if response contains explicit error field
      if (responseData.error) {
        throw new Error(responseData.details || responseData.error);
      }
      
      // Make sure response has success flag
      if (!responseData.success) {
        throw new Error('Submission incomplete. Please check your form data and try again.');
      }
      
      // Return validated response data
      return responseData;
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  }
  
  /**
   * Calculate appropriate task status based on current progress
   */
  calculateTaskStatus(isSubmitted: boolean = false): string {
    const progress = this.calculateProgress();
    
    // Calculate the new status based on progress
    const calculatedStatus = calculateTaskStatusUtil(progress, isSubmitted);
    
    // Store the calculated status for future reference
    this.taskStatus = calculatedStatus;
    
    return calculatedStatus;
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
  
  /**
   * Get demo data for auto-filling KYB forms
   * 
   * This method retrieves demo data for KYB forms from the server and
   * ensures that only valid field keys are included in the returned data.
   * 
   * @param taskId Optional task ID to specify which task to retrieve demo data for
   * @returns Record of field keys to values for demo auto-fill
   */
  public async getDemoData(taskId?: number): Promise<Record<string, any>> {
    const effectiveTaskId = taskId || this.taskId;
    
    if (!effectiveTaskId) {
      this.logger.error('No task ID provided for demo data retrieval');
      throw new Error('Task ID is required to retrieve demo data');
    }
    
    try {
      this.logger.info(`Fetching demo auto-fill data for KYB task ${effectiveTaskId}`);
      
      // Use the specific endpoint for KYB demo auto-fill
      const response = await fetch(`/api/kyb/demo-autofill/${effectiveTaskId}`, {
        credentials: 'include', // Include session cookies
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to get demo data: ${response.status}`, errorText);
        throw new Error(`Failed to get demo data: ${response.status} - ${errorText}`);
      }
      
      // Process the raw demo data from the server
      const rawDemoData = await response.json();
      
      // Extract the form data from the response
      const formData = rawDemoData.formData || rawDemoData;
      
      // Filter out fields that don't exist in our fields array
      const filteredDemoData: Record<string, any> = {};
      let skippedFields = 0;
      
      // Only include fields that exist in our form service
      const fieldKeys = this.fields.map(field => field.key);
      
      for (const [key, value] of Object.entries(formData)) {
        if (fieldKeys.includes(key)) {
          filteredDemoData[key] = value;
        } else {
          this.logger.warn(`Skipping demo field key that doesn't exist in our form: ${key}`);
          skippedFields++;
        }
      }
      
      const fieldCount = Object.keys(filteredDemoData).length;
      
      this.logger.info(`Successfully fetched and filtered demo fields: ${fieldCount} valid, ${skippedFields} skipped`);
      
      return filteredDemoData;
    } catch (error) {
      this.logger.error('Error retrieving demo data:', error);
      throw error;
    }
  }
}

// Create a factory for managing isolated instances of EnhancedKybFormService
class EnhancedKybServiceFactory {
  private instances: Map<string, EnhancedKybFormService> = new Map();
  private logger = getLogger('EnhancedKybServiceFactory');

  /**
   * Get an instance for a specific company and task
   * @param companyId The company ID
   * @param taskId The task ID
   * @returns An isolated instance of EnhancedKybFormService
   */
  getInstance(companyId: number | string, taskId: number | string): EnhancedKybFormService {
    const instanceKey = `company-${companyId}-task-${taskId}`;
    
    if (!this.instances.has(instanceKey)) {
      this.logger.info(`Creating new EnhancedKybFormService instance for ${instanceKey}`);
      this.instances.set(instanceKey, new EnhancedKybFormService());
    }
    
    return this.instances.get(instanceKey)!;
  }

  /**
   * Clear instance for a specific company and task
   * @param companyId The company ID
   * @param taskId The task ID
   */
  clearInstance(companyId: number | string, taskId: number | string): void {
    const instanceKey = `company-${companyId}-task-${taskId}`;
    
    if (this.instances.has(instanceKey)) {
      this.logger.info(`Clearing EnhancedKybFormService instance for ${instanceKey}`);
      this.instances.delete(instanceKey);
    }
  }

  /**
   * Get the current active instance or create a default one
   * This is provided for backward compatibility with existing code
   * Data isolation fix: Now properly uses company-specific instances when possible.
   */
  getDefaultInstance(): EnhancedKybFormService {
    // CRITICAL DATA ISOLATION FIX: Import user context manager
    // Using dynamic import to avoid circular dependencies
    try {
      // Import from userContext directly here to avoid circular dependencies
      const { userContext } = require('@/lib/user-context');
      const companyId = userContext.getCompanyId();
      
      if (companyId) {
        this.logger.info(`Data isolation: Using company-specific instance for: ${companyId}`);
        // Use a placeholder taskId when we don't have a specific one
        return this.getInstance(companyId, 'default-context');
      }
    } catch (error) {
      this.logger.warn('Error accessing user context manager:', error);
    }

    // When no company ID is available, fall back to app instance while logging a warning
    this.logger.warn('No company context found, using global instance - THIS MAY CAUSE DATA ISOLATION ISSUES');
    return this.getAppInstance();
  }
  
  /**
   * Get an application-level instance for global operations
   * This is more explicit than getDefaultInstance and should be preferred.
   * WARNING: This should only be used for operations that don't require company-specific data isolation!
   * Data isolation fix: now checks for company ID in user context before returning a global instance.
   */
  getAppInstance(): EnhancedKybFormService {
    // CRITICAL DATA ISOLATION FIX: Use proper user context manager
    try {
      // Import userContext directly here to avoid circular dependencies
      const { userContext } = require('@/lib/user-context');
      const companyId = userContext.getCompanyId();
      
      if (companyId) {
        this.logger.info(`Data isolation: Using company-specific instance for app-level request: ${companyId}`);
        // Use a placeholder taskId when we don't have a specific one
        return this.getInstance(companyId, 'global-context');
      }
    } catch (error) {
      this.logger.warn('Error accessing user context manager:', error);
    }

    // Fallback to truly global instance when no company context found
    const instanceKey = 'app-global-context';
    
    if (!this.instances.has(instanceKey)) {
      this.logger.info(`Creating app-level EnhancedKybFormService instance`);
      this.instances.set(instanceKey, new EnhancedKybFormService());
    }
    
    return this.instances.get(instanceKey)!;
  }
}

// Create and export the factory
export const enhancedKybServiceFactory = new EnhancedKybServiceFactory();

// For backward compatibility with a better naming convention
// DATA ISOLATION FIX: Now uses getDefaultInstance which has company isolation logic
export const enhancedKybService = enhancedKybServiceFactory.getDefaultInstance();

// Updated convenience functions that accept company and task IDs
export const getKybService = (companyId: number | string, taskId: number | string): EnhancedKybFormService => 
  enhancedKybServiceFactory.getInstance(companyId, taskId);

// Legacy convenience functions using the default instance
// These should be gradually replaced with the instance-specific versions
export const getKybFields = (): Promise<KybField[]> => enhancedKybService.getKybFields();
export const getKybFieldsByStepIndex = (stepIndex: number): Promise<KybField[]> => enhancedKybService.getKybFieldsByStepIndex(stepIndex);
export const groupKybFieldsBySection = (fields: KybField[]): Record<string, KybField[]> => enhancedKybService.groupFieldsBySection(fields);
export const getFormData = (): FormData => enhancedKybService.getFormData();
export const getTimestampedFormData = (): TimestampedFormData => enhancedKybService.getTimestampedFormData();
export const getTaskStatus = (): string => enhancedKybService.getTaskStatus();
export const setActiveSection = (sectionId: string): void => enhancedKybService.setActiveSection(sectionId);