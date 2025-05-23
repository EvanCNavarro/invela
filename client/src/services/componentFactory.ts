/**
 * ========================================
 * Component Factory Service Module
 * ========================================
 * 
 * Enterprise component factory service providing comprehensive
 * dynamic component generation, form service management, and
 * template-based component configuration for scalable UI architectures.
 * Handles intelligent component creation based on task templates and
 * form configurations for enterprise compliance workflows.
 * 
 * Key Features:
 * - Dynamic component generation with template-based configuration
 * - Singleton pattern for centralized component factory management
 * - Multiple form service integration with intelligent routing
 * - Enterprise-grade component type resolution and validation
 * - Scalable architecture supporting various component frameworks
 * - Comprehensive logging and error handling for production stability
 * 
 * Dependencies:
 * - FormService: Form field and section management interfaces
 * - TaskTemplateService: Template configuration and management
 * - FormUtils: Component type resolution utilities
 * - Logger: Structured logging for enterprise monitoring
 * 
 * @module ComponentFactory
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// Form service interfaces for component integration
import { FormField, FormSection } from '@/services/formService';
import { FormServiceInterface } from './formService';
// Utility functions for component type resolution
import { getFieldComponentType } from '@/utils/formUtils';
// Task template management for component configuration
import { TaskTemplateWithConfigs } from './taskTemplateService';
// Specialized form service factories for different compliance workflows
import { enhancedKybServiceFactory } from './enhanced-kyb-service';
import { ky3pFormServiceFactory } from './ky3p-form-service';
import { unifiedKy3pServiceFactory } from './unified-ky3p-form-service';
import { openBankingFormServiceFactory } from './open-banking-form-service';
// Enterprise logging utilities
import getLogger from '@/utils/logger';

// ========================================
// CONSTANTS
// ========================================

/**
 * Component factory configuration constants
 * Defines factory behavior and component generation settings
 */
const FACTORY_CONFIG = {
  MAX_COMPONENT_CACHE_SIZE: 100,
  COMPONENT_GENERATION_TIMEOUT: 5000,
  DEFAULT_COMPONENT_TYPE: 'text',
  SERVICE_INITIALIZATION_TIMEOUT: 3000
} as const;

/**
 * Supported component types for enterprise form generation
 * Ensures consistent component type validation and resolution
 */
const SUPPORTED_COMPONENT_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  EMAIL: 'email',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  TEXTAREA: 'textarea',
  DATE: 'date',
  FILE: 'file'
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Component configuration interface for dynamic component generation
 * 
 * Provides comprehensive configuration structure for creating components
 * with proper type safety, property validation, and template integration
 * for enterprise-grade dynamic UI generation workflows.
 */
export interface ComponentConfig {
  /** Component type identifier for factory resolution */
  type: string;
  /** Component properties and configuration data */
  props: Record<string, any>;
  /** Optional task template for component configuration */
  template?: TaskTemplateWithConfigs;
}

// ========================================
// SINGLETON FACTORY IMPLEMENTATION
// ========================================

/**
 * Singleton component factory for enterprise dynamic component generation
 * 
 * Manages component creation, form service integration, and template-based
 * configuration with comprehensive error handling and performance optimization.
 * Implements singleton pattern for centralized component management across
 * the entire application ecosystem.
 */
export class ComponentFactory {
  /** Singleton instance for centralized factory management */
  private static instance: ComponentFactory;
  /** Form service registry for specialized component generation */
  private formServices: Record<string, FormServiceInterface> = {};
  /** Component cache for performance optimization */
  private componentCache: Map<string, ComponentConfig> = new Map();
  /** Logger instance for enterprise monitoring */
  private logger = getLogger('ComponentFactory');

  /**
   * Private constructor for singleton pattern implementation
   * 
   * Initializes factory configuration and sets up component generation
   * infrastructure with comprehensive logging and error handling.
   */
  private constructor() {
    this.logger.info('Component factory initializing with enterprise configuration');
    this.initializeFormServices();
  }

  /**
   * Initialize form services for component generation
   * 
   * Sets up specialized form service factories for different compliance workflows
   * with comprehensive error handling and service registration.
   */
  private initializeFormServices(): void {
    try {
      // Initialize KYB service factory
      this.formServices['kyb'] = enhancedKybServiceFactory();
      
      // Initialize KY3P service factory  
      this.formServices['ky3p'] = ky3pFormServiceFactory();
      
      // Initialize unified KY3P service factory
      this.formServices['unified-ky3p'] = unifiedKy3pServiceFactory();
      
      // Initialize Open Banking service factory
      this.formServices['open-banking'] = openBankingFormServiceFactory();
      
      this.logger.info('Form services initialized successfully', {
        serviceCount: Object.keys(this.formServices).length,
        services: Object.keys(this.formServices)
      });
    } catch (error) {
      this.logger.error('Failed to initialize form services', { error });
      // Continue with empty services registry to prevent complete failure
    }
  }

  /**
   * Get singleton instance with thread-safe initialization
   * 
   * @returns ComponentFactory singleton instance
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