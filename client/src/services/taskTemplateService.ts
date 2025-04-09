import { apiRequest } from '@/lib/queryClient';

/**
 * Task template configuration
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
    // Create an AbortController for timeout
    const controller = new AbortController();
    let timeoutId: number | null = null;
    
    try {
      console.log(`[TaskTemplateService] Fetching template for task type: ${taskType} at ${new Date().toISOString()}`);
      
      const url = `/api/task-templates/by-type/${taskType}`;
      console.log(`[TaskTemplateService] Full URL: ${window.location.origin}${url}`);
      
      // Use direct fetch with credentials to ensure cookies are sent
      const requestStartTime = Date.now();
      console.log(`[TaskTemplateService] Starting fetch request at ${new Date(requestStartTime).toISOString()}`);
      
      const requestId = `template-by-type-${taskType}-${requestStartTime}`;
      
      // Set up timeout
      timeoutId = window.setTimeout(() => {
        controller.abort();
        console.error(`[TaskTemplateService] Request timed out after 10 seconds for task type: ${taskType}`);
      }, 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': requestId
        },
        signal: controller.signal
      });
      
      // Clear timeout since the request completed
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      const requestEndTime = Date.now();
      const requestDuration = requestEndTime - requestStartTime;
      
      console.log(`[TaskTemplateService] Template API response: 
        - Status: ${response.status} 
        - StatusText: ${response.statusText}
        - Duration: ${requestDuration}ms
        - Task Type: ${taskType}
        - Request ID: ${requestId}
        - Time: ${new Date(requestEndTime).toISOString()}
      `);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TaskTemplateService] Error fetching template for task type ${taskType}: HTTP ${response.status}`, errorText);
        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      console.log(`[TaskTemplateService] Starting JSON parsing at ${new Date().toISOString()}`);
      const data = await response.json();
      console.log(`[TaskTemplateService] Successfully fetched template:`, { 
        templateId: data.id,
        templateName: data.name,
        taskType: data.task_type,
        configCount: data.configurations?.length || 0,
        time: new Date().toISOString()
      });
      
      return data;
    } catch (error) {
      console.error('[TaskTemplateService] Error fetching task template by type:', error);
      throw error;
    } finally {
      // Clean up timeout if it still exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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