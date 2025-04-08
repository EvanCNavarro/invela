import { FormField, FormSection } from '@/services/formService';
import { FormServiceInterface } from './formService';
import { getFieldComponentType } from '@/utils/formUtils';
import { TaskTemplateWithConfigs } from './taskTemplateService';

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
    this.formServices[taskType] = service;
  }

  /**
   * Gets an appropriate form service for a task type
   * @param taskType Type of task
   * @returns FormServiceInterface implementation
   */
  public getFormService(taskType: string): FormServiceInterface | null {
    return this.formServices[taskType] || null;
  }

  /**
   * List all registered form services
   * @returns Object with task types as keys and service implementations as values
   */
  public getRegisteredFormServices(): Record<string, FormServiceInterface> {
    return { ...this.formServices };
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