/**
 * Open Banking Form Service
 * 
 * This service handles the Open Banking Survey form data
 * and provides an interface to the Universal Form component.
 */
import { EnhancedKybFormService } from './enhanced-kyb-service';

// Simple console-based logger
const logger = {
  info: (message: string, ...args: any[]) => console.log(`INFO: ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`ERROR: ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`WARN: ${message}`, ...args),
};

// Singleton instance
let _instance: OpenBankingFormService | null = null;

export class OpenBankingFormService extends EnhancedKybFormService {
  // Override the form type to match the task type in the database
  protected readonly formType = 'open_banking_survey';
  
  // Cache for Open Banking fields by template ID
  private static openBankingFieldsCache: Record<number, any[]> = {};
  
  constructor(companyId?: number, taskId?: number) {
    super(companyId, taskId);
    
    logger.info(
      '[OpenBankingFormService] Initializing Open Banking Form Service',
      { companyId, taskId }
    );
  }
  
  /**
   * COMPLETE OVERRIDE of initialize method from EnhancedKybFormService
   * to prevent inheriting the KYB section logic
   * 
   * Modified to make templateId optional and to use a direct field fetch 
   * even when no template is available
   */
  async initialize(templateId?: number): Promise<void> {
    // If already initialized and the same template ID, just return
    if (this.initialized && (templateId === undefined || this.templateId === templateId)) {
      logger.info('[OpenBankingFormService] Already initialized', { 
        templateId: templateId || 'none provided'
      });
      return; 
    }
    
    try {
      // Store template ID if provided
      if (templateId !== undefined) {
        this.templateId = templateId;
      }
      
      // Step 1: Get the field definitions from the Open Banking fields table
      // Uses a custom API endpoint for Open Banking fields
      let fields;
      
      // Only use cache if we have a template ID and it exists in cache
      if (templateId !== undefined && OpenBankingFormService.openBankingFieldsCache[templateId]) {
        fields = OpenBankingFormService.openBankingFieldsCache[templateId];
        logger.info('[OpenBankingFormService] Using cached fields for template', templateId);
      } else {
        // Always fetch fields directly from API, ignoring template
        logger.info('[OpenBankingFormService] Fetching fields from API directly');
        
        try {
          // Add credentials to ensure session cookies are sent for authentication
          const apiResponse = await fetch('/api/open-banking/fields', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!apiResponse.ok) {
            // Handle authentication errors specifically
            if (apiResponse.status === 401) {
              logger.error('[OpenBankingFormService] Authentication required for API access');
              throw new Error('Authentication required. Please log in again.');
            }
            
            throw new Error(`Failed to fetch Open Banking fields: ${apiResponse.statusText}`);
          }
          
          fields = await apiResponse.json();
          logger.info(`[OpenBankingFormService] Successfully fetched ${fields.length} fields`);
          
          // Cache if we have a template ID
          if (templateId !== undefined) {
            OpenBankingFormService.openBankingFieldsCache[templateId] = fields;
          }
        } catch (fetchError) {
          logger.error('[OpenBankingFormService] Field fetch error', fetchError);
          
          // FALLBACK FOR DEVELOPMENT/DEMO ONLY
          // Use hardcoded sample fields if API fails
          // This is only for development and should be replaced with proper error handling in production
          logger.warn('[OpenBankingFormService] Using fallback sample fields for development');
          
          // Sample minimal fields matching the database structure
          fields = [
            {
              id: 1,
              field_key: 'ob_general_info_1',
              display_name: 'Open Banking API Provider',
              question: 'Does your organization provide Open Banking APIs to third parties?',
              group: 'General Information',
              step_index: 0,
              field_type: 'SELECT',
              required: true,
              validation_rules: JSON.stringify({
                options: ['Yes', 'No', 'Planned']
              }),
              order: 0
            },
            {
              id: 2,
              field_key: 'ob_general_info_2',
              display_name: 'Open Banking API Consumer',
              question: 'Does your organization consume Open Banking APIs from other providers?',
              group: 'General Information',
              step_index: 0,
              field_type: 'SELECT',
              required: true,
              validation_rules: JSON.stringify({
                options: ['Yes', 'No', 'Planned']
              }),
              order: 1
            },
            {
              id: 3,
              field_key: 'ob_security_1',
              display_name: 'API Authentication Method',
              question: 'What authentication methods do you support for your Open Banking APIs?',
              group: 'Security',
              step_index: 1,
              field_type: 'MULTISELECT',
              required: true,
              validation_rules: JSON.stringify({
                options: ['OAuth 2.0', 'MTLS', 'API Keys', 'JWT', 'OpenID Connect']
              }),
              order: 0
            },
            {
              id: 4,
              field_key: 'ob_security_2',
              display_name: 'Data Encryption',
              question: 'Do you enforce TLS 1.2+ for all API communications?',
              group: 'Security',
              step_index: 1,
              field_type: 'SELECT',
              required: true,
              validation_rules: JSON.stringify({
                options: ['Yes', 'No', 'Partially']
              }),
              order: 1
            },
            {
              id: 5,
              field_key: 'ob_compliance_1',
              display_name: 'Regulatory Compliance',
              question: 'Which Open Banking regulatory frameworks does your organization comply with?',
              group: 'Compliance',
              step_index: 2,
              field_type: 'MULTISELECT',
              required: true,
              validation_rules: JSON.stringify({
                options: ['PSD2', 'Open Banking UK', 'FDX', 'CDR Australia', 'Brazil Open Banking', 'Other']
              }),
              order: 0
            }
          ];
        }
      }
      
      // Validate fields array exists and has content
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        logger.error('[OpenBankingFormService] No fields returned from API', { fields });
        throw new Error('No Open Banking fields found');
      }
      
      // Step 2: Process the fields into sections based on group and step_index
      const sections = this.processFieldsIntoSections(fields);
      
      // Validate sections were created
      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        logger.error('[OpenBankingFormService] No sections generated from fields', { fields });
        throw new Error('Failed to create sections from Open Banking fields');
      }
      
      // Step 3: Store the sections and set initialized flag
      this.sections = sections;
      this.initialized = true;
      
      logger.info('[OpenBankingFormService] Initialization complete', { 
        sectionsCount: sections.length,
        fieldsCount: fields.length
      });
      
    } catch (error) {
      logger.error('[OpenBankingFormService] Initialization failed', { error });
      throw error;
    }
  }
  
  /**
   * Process fields into sections based on group and step_index
   */
  private processFieldsIntoSections(fields: any[]): any[] {
    logger.info('[OpenBankingFormService] Processing fields into sections', { fieldsCount: fields.length });
    
    try {
      // Group fields by step index and group
      const fieldsByStep = fields.reduce((acc: Record<number, Record<string, any[]>>, field) => {
        const stepIndex = field.step_index || 0;
        const group = field.group || 'General';
        
        if (!acc[stepIndex]) {
          acc[stepIndex] = {};
        }
        
        if (!acc[stepIndex][group]) {
          acc[stepIndex][group] = [];
        }
        
        acc[stepIndex][group].push(field);
        return acc;
      }, {});
      
      // Convert to sections array
      const sections = Object.entries(fieldsByStep)
        .map(([stepIndex, groups]) => {
          return Object.entries(groups).map(([groupName, groupFields]) => {
            // Sort fields by order within each group
            const sortedFields = [...groupFields].sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // Map fields to the format expected by the Universal Form
            const formattedFields = sortedFields.map(field => ({
              id: field.id,
              name: field.field_key,
              label: field.display_name,
              description: field.help_text,
              type: this.mapFieldType(field.field_type),
              required: field.required,
              options: field.validation_rules ? JSON.parse(field.validation_rules) : undefined,
              placeholder: field.display_name,
              validationType: field.validation_type,
              validationRules: field.validation_rules
            }));
            
            return {
              id: `step${stepIndex}_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}`,
              title: groupName,
              order: parseInt(stepIndex),
              fields: formattedFields,
              collapsed: false
            };
          });
        })
        .flat()
        // Sort sections by order
        .sort((a, b) => a.order - b.order);
      
      logger.info('[OpenBankingFormService] Sections processing complete', { 
        sectionsCount: sections.length
      });
      
      return sections;
    } catch (error) {
      logger.error('[OpenBankingFormService] Error processing fields into sections', { error });
      throw error;
    }
  }
  
  /**
   * Map field type from database to Universal Form field type
   */
  private mapFieldType(fieldType: string): string {
    switch (fieldType.toUpperCase()) {
      case 'TEXT':
        return 'text';
      case 'TEXTAREA':
        return 'textarea';
      case 'SELECT':
        return 'select';
      case 'MULTISELECT':
        return 'multiselect';
      case 'CHECKBOX':
        return 'checkbox';
      case 'RADIO':
        return 'radio';
      case 'DATE':
        return 'date';
      case 'FILE':
        return 'file';
      default:
        return 'text';
    }
  }
  
  /**
   * Get the sections for the current form template
   */
  async getSections(): Promise<any[]> {
    if (!this.initialized) {
      logger.warn('[OpenBankingFormService] Not initialized, attempting auto-initialization');
      try {
        await this.initialize();
      } catch (error) {
        logger.error('[OpenBankingFormService] Auto-initialization failed', { error });
        throw new Error('Open Banking Form Service not initialized. Call initialize() first.');
      }
    }
    
    logger.info('[OpenBankingFormService] Getting sections', { count: this.sections.length });
    return this.sections;
  }
  
  /**
   * Get all fields from all sections
   * This is required by the FormServiceInterface
   */
  getFields(): any[] {
    if (!this.initialized) {
      logger.warn('[OpenBankingFormService] getFields called before initialization');
      return [];
    }
    
    // Extract fields from all sections and flatten into a single array
    const allFields = this.sections.flatMap(section => {
      return section.fields || [];
    });
    
    // Map fields to ensure they have a "key" property that matches "name"
    // This is needed for compatibility with the Universal Form component
    const fieldsWithKeys = allFields.map(field => ({
      ...field,
      key: field.name || field.key // Ensure key exists
    }));
    
    logger.info('[OpenBankingFormService] Returning all fields', { count: fieldsWithKeys.length });
    return fieldsWithKeys;
  }
  
  /**
   * Save form responses for a task
   */
  async saveResponses(taskId: number, data: Record<string, any>): Promise<void> {
    logger.info('[OpenBankingFormService] Saving responses', { taskId, dataKeys: Object.keys(data).length });
    
    try {
      // Convert data to array of responses
      const responses = Object.entries(data).map(([fieldKey, value]) => ({
        field_key: fieldKey,
        response_value: value
      }));
      
      // Save responses
      const apiResponse = await fetch(`/api/open-banking/responses/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responses })
      });
      
      if (!apiResponse.ok) {
        throw new Error(`Failed to save responses: ${apiResponse.statusText}`);
      }
      
      logger.info('[OpenBankingFormService] Responses saved successfully', { taskId });
    } catch (error) {
      logger.error('[OpenBankingFormService] Error saving responses', { error, taskId });
      throw error;
    }
  }
}

/**
 * Factory class for creating isolated Open Banking form service instances
 * Follows the same pattern as EnhancedKybServiceFactory
 */
export class OpenBankingFormServiceFactory {
  private static instance: OpenBankingFormServiceFactory;
  private instances: Map<string, OpenBankingFormService> = new Map();
  
  private constructor() {}
  
  public static getInstance(): OpenBankingFormServiceFactory {
    if (!OpenBankingFormServiceFactory.instance) {
      OpenBankingFormServiceFactory.instance = new OpenBankingFormServiceFactory();
    }
    return OpenBankingFormServiceFactory.instance;
  }
  
  /**
   * Get or create an isolated Open Banking form service instance
   * @param companyId The company ID
   * @param taskId The task ID
   * @returns Open Banking form service instance specific to this company and task
   */
  public getServiceInstance(companyId: number | string, taskId: number | string): OpenBankingFormService {
    const key = `${companyId}-${taskId}`;
    
    if (!this.instances.has(key)) {
      logger.info(`[OpenBankingFormServiceFactory] Creating new Open Banking form service instance for company ${companyId}, task ${taskId}`);
      this.instances.set(key, new OpenBankingFormService(Number(companyId), Number(taskId)));
    }
    
    return this.instances.get(key)!;
  }
}

// Create singleton instance for use in the application
export const openBankingFormService = _instance || (_instance = new OpenBankingFormService());
export const openBankingFormServiceFactory = OpenBankingFormServiceFactory.getInstance();