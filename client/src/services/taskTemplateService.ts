/**
 * ========================================
 * Task Template Service - Configuration Management
 * ========================================
 * 
 * Enterprise task template and configuration management service providing
 * comprehensive template orchestration, dynamic configuration handling,
 * and workflow template management for the risk assessment platform.
 * 
 * Key Features:
 * - Dynamic task template configuration management
 * - Hierarchical configuration scoping (global, section, field)
 * - Template lifecycle management and versioning
 * - Type-safe configuration value handling
 * - Real-time template updates and synchronization
 * 
 * Configuration Scopes:
 * - Global: Application-wide template settings
 * - Section: Section-specific configurations
 * - Field: Individual field-level customizations
 * 
 * Template Types:
 * - KYB assessment templates
 * - KY3P evaluation templates  
 * - Open Banking compliance templates
 * - Custom workflow templates
 * 
 * @module services/taskTemplateService
 * @version 1.0.0
 * @since 2025-05-23
 */

import { apiRequest } from '@/lib/queryClient';

/**
 * Task template configuration interface
 * 
 * Defines the structure for template configuration entries
 * supporting hierarchical scoping and dynamic value types
 */
export interface TemplateConfiguration {
  id: number;
  template_id: number;
  config_key: string;
  config_value: any;
  scope: 'global' | 'section' | 'field';
  scope_target?: string;
  created_at: Date | null;
  updated_at: Date | null;
}

/**
 * Task template
 */
export interface TaskTemplate {
  id: number;
  name: string;
  description: string;
  task_type: string;
  component_type: string;
  status: string;
  created_at: Date | null;
  updated_at: Date | null;
}

/**
 * Task template with configurations
 */
export interface TaskTemplateWithConfigs extends TaskTemplate {
  configurations: TemplateConfiguration[];
}

/**
 * Task Template Service
 * 
 * This service handles task template operations
 */
export class TaskTemplateService {
  /**
   * Get a task template by ID
   * @param id Template ID
   * @returns Promise with template and configurations
   */
  static async getTemplate(id: number): Promise<TaskTemplateWithConfigs> {
    try {
      console.log(`[TaskTemplateService] Fetching template by ID: ${id}`);
      
      // Use direct fetch with credentials to ensure cookies are sent
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TaskTemplateService] Error fetching template with ID ${id}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to fetch template: ${response.status} ${errorText}`);
      }
      
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