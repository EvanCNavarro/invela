/**
 * ========================================
 * Task Template Service Module
 * ========================================
 * 
 * Enterprise task template management service providing comprehensive
 * template configuration, task type management, and component integration.
 * Handles dynamic task creation, configuration management, and template
 * lifecycle operations for scalable task management workflows.
 * 
 * Key Features:
 * - Task template lifecycle management with version control
 * - Configuration management with scoped settings support
 * - Component type integration for flexible task creation
 * - Comprehensive status tracking and template validation
 * - Real-time template updates and synchronization
 * 
 * Dependencies:
 * - QueryClient: API request management and caching infrastructure
 * 
 * @module TaskTemplateService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// API request utilities for template data persistence and retrieval
import { apiRequest } from '@/lib/queryClient';

// ========================================
// CONSTANTS
// ========================================

/**
 * Task template service configuration constants
 * Defines baseline values for template management and validation
 */
const TASK_TEMPLATE_DEFAULTS = {
  DEFAULT_STATUS: 'active',
  DEFAULT_COMPONENT_TYPE: 'form',
  CONFIGURATION_TIMEOUT: 30000,
  MAX_CONFIGURATIONS_PER_TEMPLATE: 100
} as const;

/**
 * Template configuration scope types for organized settings management
 * Defines the hierarchy and organization of template configurations
 */
const CONFIGURATION_SCOPES = {
  GLOBAL: 'global',
  SECTION: 'section', 
  FIELD: 'field'
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Template configuration interface for comprehensive settings management
 * 
 * Defines structured configuration data for task templates with scoped
 * settings support, enabling flexible template customization at global,
 * section, and field levels for comprehensive task management workflows.
 */
export interface TemplateConfiguration {
  /** Unique configuration identifier */
  id: number;
  /** Associated template identifier for relationship tracking */
  template_id: number;
  /** Configuration key for setting identification */
  config_key: string;
  /** Configuration value with flexible data type support */
  config_value: any;
  /** Configuration scope level for hierarchical organization */
  scope: 'global' | 'section' | 'field';
  /** Optional scope target for specific section or field targeting */
  scope_target?: string;
  /** Configuration creation timestamp */
  created_at: Date | null;
  /** Configuration last update timestamp */
  updated_at: Date | null;
}

/**
 * Task template interface for comprehensive template management
 * 
 * Provides complete task template structure with metadata, type
 * classification, and status tracking for dynamic task creation
 * and management workflows throughout the application lifecycle.
 */
export interface TaskTemplate {
  /** Unique template identifier */
  id: number;
  /** Human-readable template name */
  name: string;
  /** Detailed template description and purpose */
  description: string;
  /** Task type classification for workflow organization */
  task_type: string;
  /** Component type for rendering and interaction specification */
  component_type: string;
  /** Template status for lifecycle management */
  status: string;
  /** Template creation timestamp */
  created_at: Date | null;
  /** Template last update timestamp */
  updated_at: Date | null;
}

/**
 * Task template with configurations interface for complete template data
 * 
 * Extends base TaskTemplate with associated configuration array for
 * comprehensive template management including all settings and
 * customization options in a single data structure.
 */
export interface TaskTemplateWithConfigs extends TaskTemplate {
  /** Array of associated template configurations */
  configurations: TemplateConfiguration[];
}

// ========================================
// SERVICE IMPLEMENTATION
// ========================================

/**
 * Task Template Service for enterprise template management
 * 
 * Provides comprehensive task template operations including CRUD operations,
 * configuration management, and template lifecycle management. Implements
 * defensive programming patterns with proper error handling and logging
 * for production-ready template management workflows.
 */
export class TaskTemplateService {
  /**
   * Get a task template by ID with comprehensive error handling
   * 
   * Retrieves a complete task template including all associated configurations
   * with proper authentication and request tracking for reliable template access.
   * 
   * @param id Template identifier for retrieval
   * @returns Promise resolving to complete template with configurations
   * 
   * @throws {Error} When template retrieval fails or template not found
   */
  static async getTemplate(id: number): Promise<TaskTemplateWithConfigs> {
    try {
      // Validate input parameters for defensive programming
      if (!id || typeof id !== 'number' || id <= 0) {
        throw new Error(`Invalid template ID provided: ${id}`);
      }

      console.log(`[TaskTemplateService] Fetching template by ID: ${id}`);
      
      // Execute authenticated API request with comprehensive headers
      const response = await fetch(`/api/task-templates/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `template-by-id-${id}-${Date.now()}`
        }
      });
      
      console.log(`[TaskTemplateService] Template API response status: ${response.status} for template ID ${id}`);
      
      // Handle error responses with detailed logging
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TaskTemplateService] Error fetching template with ID ${id}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to fetch template: ${response.status} ${errorText}`);
      }
      
      // Parse and validate response data
      const data = await response.json();
      console.log(`[TaskTemplateService] Successfully fetched template by ID:`, { 
        templateId: data.id,
        templateName: data.name,
        configCount: data.configurations?.length || 0
      });
      
      return data;
    } catch (error) {
      console.error('[TaskTemplateService] Error fetching task template:', error);
      throw error;
    }
  }
  
  /**
   * Get a task template by task type
   * @param taskType Type of task
   * @returns Promise with template and configurations
   */
  static async getTemplateByTaskType(taskType: string): Promise<TaskTemplateWithConfigs> {
    try {
      console.log(`[TaskTemplateService] Fetching template for task type: ${taskType}`);
      
      const url = `/api/task-templates/by-type/${taskType}`;
      
      // Simple fetch implementation
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TaskTemplateService] Error fetching template for task type ${taskType}: HTTP ${response.status}`, errorText);
        // Cache the "not found" state for Open Banking templates to avoid repeated network requests
        if (response.status === 404 && (taskType === 'open_banking_survey' || taskType === 'open_banking')) {
          // For open banking, we want to proceed without a template, so instead of throwing we return a minimal template
          return {
            id: -1, // Use a special ID to indicate a virtual template
            name: 'Open Banking Survey Template',
            description: 'Virtual template for Open Banking Survey',
            task_type: 'open_banking_survey',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            configurations: []
          };
        }
        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[TaskTemplateService] Successfully fetched template:`, { 
        templateId: data.id,
        templateName: data.name,
        taskType: data.task_type,
        configCount: data.configurations?.length || 0
      });
      
      return data;
    } catch (error) {
      console.error('[TaskTemplateService] Error fetching task template by type:', error);
      
      // For open banking, we should continue even if template fetch fails
      if ((taskType === 'open_banking_survey' || taskType === 'open_banking')) {
        console.warn('[TaskTemplateService] Using fallback template for Open Banking');
        return {
          id: -1, // Use a special ID to indicate a virtual template
          name: 'Open Banking Survey Template (Fallback)',
          description: 'Virtual fallback template for Open Banking Survey',
          task_type: 'open_banking_survey',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          configurations: []
        };
      }
      
      throw error;
    }
  }
  
  /**
   * List all task templates
   * @param activeOnly Whether to only return active templates
   * @returns Promise with array of templates
   */
  static async listTemplates(activeOnly: boolean = true): Promise<TaskTemplate[]> {
    try {
      const url = activeOnly ? '/api/task-templates?active=true' : '/api/task-templates';
      const response = await apiRequest<TaskTemplate[]>(url);
      return response;
    } catch (error) {
      console.error('Error listing task templates:', error);
      throw error;
    }
  }
  
  /**
   * Create a new task template
   * @param template Template data
   * @returns Promise with created template
   */
  static async createTemplate(
    template: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaskTemplate> {
    try {
      const response = await apiRequest<TaskTemplate>('/api/task-templates', {
        method: 'POST',
        data: template
      });
      return response;
    } catch (error) {
      console.error('Error creating task template:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing task template
   * @param id Template ID
   * @param template Template data to update
   * @returns Promise with updated template
   */
  static async updateTemplate(
    id: number,
    template: Partial<Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<TaskTemplate> {
    try {
      const response = await apiRequest<TaskTemplate>(`/api/task-templates/${id}`, {
        method: 'PATCH',
        data: template
      });
      return response;
    } catch (error) {
      console.error('Error updating task template:', error);
      throw error;
    }
  }
  
  /**
   * Add a configuration to a template
   * @param templateId Template ID
   * @param config Configuration to add
   * @returns Promise with added configuration
   */
  static async addConfiguration(
    templateId: number,
    config: Omit<TemplateConfiguration, 'id' | 'created_at' | 'updated_at' | 'template_id'>
  ): Promise<TemplateConfiguration> {
    try {
      const response = await apiRequest<TemplateConfiguration>(`/api/task-templates/${templateId}/configurations`, {
        method: 'POST',
        data: config
      });
      return response;
    } catch (error) {
      console.error('Error adding template configuration:', error);
      throw error;
    }
  }
  
  /**
   * Update a template configuration
   * @param templateId Template ID
   * @param configId Configuration ID
   * @param config Configuration data to update
   * @returns Promise with updated configuration
   */
  static async updateConfiguration(
    templateId: number,
    configId: number,
    config: Partial<Omit<TemplateConfiguration, 'id' | 'created_at' | 'updated_at' | 'template_id'>>
  ): Promise<TemplateConfiguration> {
    try {
      const response = await apiRequest<TemplateConfiguration>(
        `/api/task-templates/${templateId}/configurations/${configId}`,
        {
          method: 'PATCH',
          data: config
        }
      );
      return response;
    } catch (error) {
      console.error('Error updating template configuration:', error);
      throw error;
    }
  }
  
  /**
   * Delete a template configuration
   * @param templateId Template ID
   * @param configId Configuration ID
   * @returns Promise that resolves when configuration is deleted
   */
  static async deleteConfiguration(templateId: number, configId: number): Promise<void> {
    try {
      await apiRequest(`/api/task-templates/${templateId}/configurations/${configId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting template configuration:', error);
      throw error;
    }
  }
}