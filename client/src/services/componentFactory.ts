/**
 * ========================================
 * Component Factory - Dynamic Form Generation Engine
 * ========================================
 * 
 * Advanced component factory service providing dynamic form generation and
 * service orchestration based on task templates and configurations. Manages
 * intelligent component creation, service registration, and template-driven UI rendering.
 * 
 * Key Features:
 * - Dynamic form component generation from templates
 * - Intelligent service factory pattern with singleton management
 * - Multi-service orchestration (KYB, KY3P, Open Banking)
 * - Template-driven configuration management
 * - Advanced logging and performance monitoring
 * 
 * Factory Capabilities:
 * - Automated service instantiation based on template types
 * - Component configuration management with type safety
 * - Service lifecycle management and caching
 * - Template configuration inheritance and merging
 * - Cross-service coordination and data flow management
 * 
 * @module services/componentFactory
 * @version 1.0.0
 * @since 2025-05-23
 */

import { FormField, FormSection } from '@/services/formService';
import { FormServiceInterface } from './formService';
import { getFieldComponentType } from '@/utils/formUtils';
import { TaskTemplateWithConfigs } from './taskTemplateService';
import { enhancedKybServiceFactory } from './enhanced-kyb-service';
import { ky3pFormServiceFactory } from './ky3p-form-service';
import { unifiedKy3pServiceFactory } from './unified-ky3p-form-service';
import { openBankingFormServiceFactory } from './open-banking-form-service';
import getLogger from '@/utils/logger';

/**
 * Interface for component configuration
 */
export interface ComponentConfig {
  type: string;
  props: Record<string, any>;
  template?: TaskTemplateWithConfigs;
}

/**
 * Factory for creating form components based on template configurations
 */
export class ComponentFactory {
  private static instance: ComponentFactory;
  private formServices: Record<string, FormServiceInterface> = {};

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Gets the singleton instance
   */
  public static getInstance(): ComponentFactory {
    if (!ComponentFactory.instance) {
      ComponentFactory.instance = new ComponentFactory();
    }
    return ComponentFactory.instance;
  }

  /**
   * Register a form service implementation for a specific task type
   * @param taskType Type of task
   * @param service FormServiceInterface implementation
   */
  public registerFormService(taskType: string, service: FormServiceInterface): void {
    console.log(`[ComponentFactory] Registering form service for task type: ${taskType}`, {
      serviceType: service.constructor.name,
      timestamp: new Date().toISOString()
    });
    
    // Safety check to prevent overriding existing services without warning
    if (this.formServices[taskType]) {
      console.warn(`[ComponentFactory] Overriding existing service for task type: ${taskType}`, {
        oldServiceType: this.formServices[taskType].constructor.name,
        newServiceType: service.constructor.name
      });
    }
    
    this.formServices[taskType] = service;
    
    // Log the updated list of registered services
    const serviceTypes = Object.entries(this.formServices).map(([type, svc]) => 
      `${type}: ${svc.constructor.name}`
    );
    console.log(`[ComponentFactory] Current registered services: [${serviceTypes.join(', ')}]`);
  }

  /**
   * Gets an appropriate form service for a task type
   * @param taskType Type of task
   * @returns FormServiceInterface implementation
   */
  public getFormService(taskType: string): FormServiceInterface | null {
    const service = this.formServices[taskType] || null;
    
    console.log(`[ComponentFactory] Looking up form service for task type: ${taskType}`, {
      found: !!service,
      serviceType: service ? (typeof service === 'function' ? 'factory function' : service.constructor.name) : 'null',
      timestamp: new Date().toISOString()
    });
    
    // If the registered service is a factory function, invoke it with default values
    if (service && typeof service === 'function') {
      console.log(`[ComponentFactory] Service for ${taskType} is a factory function, creating instance`);
      try {
        // Call the factory with default values
        const serviceInstance = service(0, 0);
        return serviceInstance;
      } catch (error) {
        console.error(`[ComponentFactory] Error creating service instance from factory`, error);
        return null;
      }
    }
    
    // If service not found, log all available services for debugging
    if (!service) {
      const availableServices = Object.keys(this.formServices);
      console.warn(`[ComponentFactory] No service found for task type: ${taskType}. Available services: [${availableServices.join(', ')}]`);
      
      // Try fallbacks based on common naming patterns
      if (taskType === 'ky3p') {
        const fallbacks = ['security', 'security_assessment', 'sp_ky3p_assessment'];
        for (const fallback of fallbacks) {
          const fallbackService = this.formServices[fallback];
          if (fallbackService) {
            console.log(`[ComponentFactory] Found fallback service for '${taskType}' using '${fallback}'`);
            return typeof fallbackService === 'function' ? fallbackService(0, 0) : fallbackService;
          }
        }
      } else if (taskType === 'open_banking') {
        const fallbackService = this.formServices['open_banking_survey'];
        if (fallbackService) {
          console.log(`[ComponentFactory] Found fallback service for '${taskType}' using 'open_banking_survey'`);
          return typeof fallbackService === 'function' ? fallbackService(0, 0) : fallbackService;
        }
      }
    }
    
    return service;
  }
  
  /**
   * Gets a company/task-specific form service instance
   * This ensures proper data isolation between different companies and tasks
   * 
   * @param taskType Type of task (e.g., 'kyb', 'company_kyb', 'sp_ky3p_assessment')
   * @param companyId The company ID
   * @param taskId The task ID
   * @returns FormServiceInterface implementation
   */
  public getIsolatedFormService(taskType: string, companyId: number | string, taskId: number | string): FormServiceInterface | null {
    const logger = getLogger('ComponentFactory');
    
    // Get the appropriate factory based on task type
    if (taskType === 'kyb' || taskType === 'company_kyb') {
      // Get instance from Enhanced KYB factory
      logger.info(`Getting isolated KYB service instance for company ${companyId}, task ${taskId}`);
      return enhancedKybServiceFactory.getInstance(companyId, taskId);
    } else if (taskType === 'sp_ky3p_assessment' || taskType === 'ky3p' || taskType === 'security' || taskType === 'security_assessment') {
      // Get instance from Unified KY3P factory instead of the old one
      logger.info(`Getting isolated UNIFIED KY3P service instance for company ${companyId}, task ${taskId} (type: ${taskType})`);
      
      try {
        // Use the unified KY3P service factory first
        return unifiedKy3pServiceFactory.getServiceInstance(companyId, taskId);
      } catch (error) {
        logger.error(`Error creating unified KY3P service, falling back to legacy service:`, error);
        // Only use legacy service as fallback
        return ky3pFormServiceFactory.getServiceInstance(companyId, taskId);
      }
    } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
      // Get instance from OpenBanking factory
      logger.info(`Getting isolated Open Banking service instance for company ${companyId}, task ${taskId} (type: ${taskType})`);
      
      // Use the imported factory (now imported at the top of the file)
      return openBankingFormServiceFactory.getServiceInstance(companyId, taskId);
    }
    
    // Fall back to standard form service for other task types
    logger.warn(`Isolated service requested for unsupported task type: ${taskType}`);
    return this.getFormService(taskType);
  }

  /**
   * List all registered form services
   * @returns Object with task types as keys and service implementations as values
   */
  public getRegisteredFormServices(): Record<string, FormServiceInterface> {
    const services = { ...this.formServices };
    
    // Log all registered services
    const serviceCount = Object.keys(services).length;
    console.log(`[ComponentFactory] Getting all registered form services (${serviceCount} total)`);
    
    // Log information about each service
    Object.entries(services).forEach(([type, service]) => {
      const serviceType = typeof service === 'function' 
        ? 'factory function' 
        : (service?.constructor?.name || 'unknown');
      console.log(`[ComponentFactory] Registered service: ${type} -> ${serviceType}`);
    });
    
    return services;
  }

  /**
   * Creates field component configuration based on template settings
   * @param field Field information
   * @param template Template with configuration
   * @returns Component configuration
   */
  public createFieldComponent(field: FormField, template: TaskTemplateWithConfigs): ComponentConfig {
    // Base component type from field or template default
    const defaultFieldType = this.getTemplateConfig(template, 'defaultFieldType', 'global') || 'single-line';
    const componentType = getFieldComponentType(field, defaultFieldType);
    
    // Base component props
    const props: Record<string, any> = {
      id: field.key,
      name: field.key,
      label: field.label,
      placeholder: field.placeholder || '',
      helpText: field.helpText || '',
      required: field.validation?.required || false,
      defaultValue: field.default || '',
      className: '',
      disabled: false,
      readOnly: false,
      hidden: false,
    };
    
    // Add options for select, radio, etc.
    if (field.options) {
      props.options = field.options;
    }
    
    // Apply field overrides from template configuration
    const fieldOverrides = this.getTemplateConfig(template, 'fieldOverrides', 'field', field.key);
    if (fieldOverrides && typeof fieldOverrides === 'object') {
      Object.entries(fieldOverrides).forEach(([key, value]) => {
        props[key] = value;
      });
    }
    
    // Special handling for different component types
    switch (componentType) {
      case 'select':
      case 'multi-select':
        props.placeholder = props.placeholder || 'Select an option';
        break;
      case 'date':
        props.placeholder = props.placeholder || 'YYYY-MM-DD';
        break;
      case 'time':
        props.placeholder = props.placeholder || 'HH:MM';
        break;
      case 'email':
        props.placeholder = props.placeholder || 'name@example.com';
        break;
      case 'phone':
        props.placeholder = props.placeholder || '+1 (555) 555-5555';
        break;
    }
    
    return {
      type: componentType,
      props,
      template
    };
  }

  /**
   * Creates section component configuration based on template settings
   * @param section Section information
   * @param template Template with configuration
   * @returns Component configuration
   */
  public createSectionComponent(section: FormSection, template: TaskTemplateWithConfigs): ComponentConfig {
    // Base component props
    const props: Record<string, any> = {
      id: section.id,
      title: section.title,
      description: section.description || '',
      collapsed: section.collapsed,
      className: '',
      hidden: false,
    };
    
    // Apply section overrides from template configuration
    const sectionOverrides = this.getTemplateConfig(template, 'sectionOverrides', 'section', section.id);
    if (sectionOverrides && typeof sectionOverrides === 'object') {
      Object.entries(sectionOverrides).forEach(([key, value]) => {
        props[key] = value;
      });
    }
    
    return {
      type: 'section',
      props,
      template
    };
  }
  
  /**
   * Get a specific configuration value from a template
   * @param template Template with configurations
   * @param key Configuration key to look for
   * @param scope Configuration scope (global, section, field)
   * @param target Target for scoped configurations
   * @returns Configuration value or undefined if not found
   */
  private getTemplateConfig(
    template: TaskTemplateWithConfigs,
    key: string,
    scope: 'global' | 'section' | 'field',
    target?: string
  ): any {
    if (!template.configurations) return undefined;
    
    const config = template.configurations.find(c => 
      c.config_key === key && 
      c.scope === scope && 
      (scope === 'global' || c.scope_target === target)
    );
    
    return config?.config_value;
  }
}

// Export a singleton instance of the component factory
export const componentFactory = ComponentFactory.getInstance();