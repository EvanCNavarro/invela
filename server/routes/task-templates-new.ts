import express from 'express';
import { db } from '@db';
import { taskTemplates, componentConfigurations } from '@db/schema';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

/**
 * Get all task templates
 * GET /api/task-templates
 */
router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    
    let query = db.select().from(taskTemplates);
    
    if (activeOnly) {
      query = query.where(eq(taskTemplates.status, 'active'));
    }
    
    const templates = await query;
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching task templates:', error);
    res.status(500).json({ error: 'Failed to fetch task templates' });
  }
});

/**
 * Get a specific task template by ID with its configurations
 * GET /api/task-templates/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    const template = await db.query.taskTemplates.findFirst({
      where: eq(taskTemplates.id, templateId)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const configurations = await db.query.componentConfigurations.findMany({
      where: eq(componentConfigurations.template_id, templateId)
    });
    
    res.json({
      ...template,
      configurations
    });
  } catch (error) {
    console.error('Error fetching task template:', error);
    res.status(500).json({ error: 'Failed to fetch task template' });
  }
});

/**
 * Get a task template by task type with its configurations
 * GET /api/task-templates/by-type/:taskType
 */
router.get('/by-type/:taskType', async (req, res) => {
  try {
    const taskType = req.params.taskType;
    
    // Use separate where conditions to avoid potential SQL syntax issues
    const template = await db.query.taskTemplates.findFirst({
      where: (templates) => {
        return and(
          eq(templates.task_type, taskType),
          eq(templates.status, 'active')
        );
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: `No active template found for task type: ${taskType}` });
    }
    
    const configurations = await db.query.componentConfigurations.findMany({
      where: eq(componentConfigurations.template_id, template.id)
    });
    
    res.json({
      ...template,
      configurations
    });
  } catch (error) {
    console.error('Error fetching task template by type:', error);
    res.status(500).json({ error: 'Failed to fetch task template by type' });
  }
});

/**
 * Create a new task template
 * POST /api/task-templates
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, task_type, component_type = 'form', status = 'active' } = req.body;
    
    if (!name || !description || !task_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // First check if there's already a template with this task type
    const existingTemplate = await db.query.taskTemplates.findFirst({
      where: eq(taskTemplates.task_type, task_type)
    });
    
    if (existingTemplate) {
      return res.status(409).json({ 
        error: `A template for task type "${task_type}" already exists (ID: ${existingTemplate.id})` 
      });
    }
    
    // Insert the new template
    const result = await db.insert(taskTemplates).values({
      name,
      description,
      task_type,
      component_type,
      status
    }).returning();
    
    if (!result.length) {
      return res.status(500).json({ error: 'Failed to create template' });
    }
    
    const newTemplate = result[0];
    
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating task template:', error);
    res.status(500).json({ error: 'Failed to create task template' });
  }
});

/**
 * Update an existing task template
 * PATCH /api/task-templates/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    const { name, description, task_type, component_type, status } = req.body;
    
    // Check if the template exists
    const template = await db.query.taskTemplates.findFirst({
      where: eq(taskTemplates.id, templateId)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Update the template
    const result = await db.update(taskTemplates)
      .set({
        name: name ?? template.name,
        description: description ?? template.description,
        task_type: task_type ?? template.task_type,
        component_type: component_type ?? template.component_type,
        status: status !== undefined ? status : template.status
      })
      .where(eq(taskTemplates.id, templateId))
      .returning();
    
    if (!result.length) {
      return res.status(500).json({ error: 'Failed to update template' });
    }
    
    const updatedTemplate = result[0];
    
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating task template:', error);
    res.status(500).json({ error: 'Failed to update task template' });
  }
});

/**
 * Add a configuration to a task template
 * POST /api/task-templates/:id/configurations
 */
router.post('/:id/configurations', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    // Check if the template exists
    const template = await db.query.taskTemplates.findFirst({
      where: eq(taskTemplates.id, templateId)
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { config_key, config_value, scope, scope_target } = req.body;
    
    if (!config_key || config_value === undefined || !scope) {
      return res.status(400).json({ error: 'Missing required configuration fields' });
    }
    
    // Check if configuration with the same key and scope already exists
    const existingConfig = await db.query.componentConfigurations.findFirst({
      where: (configs) => {
        return and(
          eq(configs.template_id, templateId),
          eq(configs.config_key, config_key),
          eq(configs.scope, scope),
          scope_target ? eq(configs.scope_target, scope_target) : undefined
        );
      }
    });
    
    if (existingConfig) {
      return res.status(409).json({ 
        error: `Configuration with key "${config_key}" already exists for this template and scope` 
      });
    }
    
    // Insert the new configuration
    const result = await db.insert(componentConfigurations).values({
      template_id: templateId,
      config_key,
      config_value,
      scope,
      scope_target
    }).returning();
    
    if (!result.length) {
      return res.status(500).json({ error: 'Failed to create configuration' });
    }
    
    const newConfig = result[0];
    
    res.status(201).json(newConfig);
  } catch (error) {
    console.error('Error adding template configuration:', error);
    res.status(500).json({ error: 'Failed to add template configuration' });
  }
});

/**
 * Update an existing configuration
 * PATCH /api/task-templates/:id/configurations/:configId
 */
router.patch('/:id/configurations/:configId', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const configId = parseInt(req.params.configId);
    
    if (isNaN(templateId) || isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid ID parameters' });
    }
    
    // Check if the configuration exists
    const config = await db.query.componentConfigurations.findFirst({
      where: (configs) => {
        return and(
          eq(configs.id, configId),
          eq(configs.template_id, templateId)
        );
      }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    const { config_key, config_value, scope, scope_target } = req.body;
    
    // Update the configuration
    const result = await db.update(componentConfigurations)
      .set({
        config_key: config_key ?? config.config_key,
        config_value: config_value !== undefined ? config_value : config.config_value,
        scope: scope ?? config.scope,
        scope_target: scope_target !== undefined ? scope_target : config.scope_target
      })
      .where(eq(componentConfigurations.id, configId))
      .returning();
    
    if (!result.length) {
      return res.status(500).json({ error: 'Failed to update configuration' });
    }
    
    const updatedConfig = result[0];
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating template configuration:', error);
    res.status(500).json({ error: 'Failed to update template configuration' });
  }
});

/**
 * Delete a configuration
 * DELETE /api/task-templates/:id/configurations/:configId
 */
router.delete('/:id/configurations/:configId', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const configId = parseInt(req.params.configId);
    
    if (isNaN(templateId) || isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid ID parameters' });
    }
    
    // Check if the configuration exists
    const config = await db.query.componentConfigurations.findFirst({
      where: (configs) => {
        return and(
          eq(configs.id, configId),
          eq(configs.template_id, templateId)
        );
      }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    // Delete the configuration
    await db.delete(componentConfigurations)
      .where((configs) => {
        return and(
          eq(configs.id, configId),
          eq(configs.template_id, templateId)
        );
      });
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting template configuration:', error);
    res.status(500).json({ error: 'Failed to delete template configuration' });
  }
});

export default router;