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
   */
  async initialize(templateId: number): Promise<void> {
    if (this.initialized && this.templateId === templateId) {
      logger.info('[OpenBankingFormService] Already initialized with template:', templateId);
      return; // Already initialized with this template
    }
    
    try {
      this.templateId = templateId;
      
      // Step 1: Get the field definitions from the Open Banking fields table
      // Uses a custom API endpoint for Open Banking fields
      let fields;
      if (OpenBankingFormService.openBankingFieldsCache[templateId]) {
        fields = OpenBankingFormService.openBankingFieldsCache[templateId];
        logger.info('[OpenBankingFormService] Using cached fields for template', templateId);
      } else {
        logger.info('[OpenBankingFormService] Fetching fields from API for template', templateId);
        const apiResponse = await fetch('/api/open-banking/fields');
        
        if (!apiResponse.ok) {
          throw new Error(`Failed to fetch Open Banking fields: ${apiResponse.statusText}`);
        }
        
        fields = await apiResponse.json();
        OpenBankingFormService.openBankingFieldsCache[templateId] = fields;
      }
      
      // Step 2: Process the fields into sections based on group and step_index
      const sections = this.processFieldsIntoSections(fields);
      
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
      throw new Error('Open Banking Form Service not initialized. Call initialize() first.');
    }
    
    logger.info('[OpenBankingFormService] Getting sections', { count: this.sections.length });
    return this.sections;
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