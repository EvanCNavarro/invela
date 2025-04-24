/**
 * Universal Demo Auto-Fill API Route
 * 
 * This file provides a unified API endpoint for automatically filling all form types
 * (KYB, KY3P, Open Banking) with demo data using the UniversalDemoAutoFillService.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { universalDemoAutoFillService, getFormTypeFromTaskType } from '../services/universalDemoAutoFillService';
import { db } from '../../db';
import { 
  tasks,
  kybFields,
  kybResponses,
  ky3pFields,
  ky3pResponses,
  openBankingFields,
  openBankingResponses
} from '../../db/schema';
import { eq } from 'drizzle-orm';

// Configuration for direct database access to form data
type FormTypeKey = 'kyb' | 'ky3p' | 'open_banking';

interface FormTypeConfig {
  fieldsTable: any;
  responsesTable: any;
  fieldKeyColumn: string;
  responseValueColumn: string;
}

const formTypeConfigs: Record<FormTypeKey, FormTypeConfig> = {
  kyb: {
    fieldsTable: kybFields,
    responsesTable: kybResponses,
    fieldKeyColumn: 'field_key',
    responseValueColumn: 'response_value'
  },
  ky3p: {
    fieldsTable: ky3pFields,
    responsesTable: ky3pResponses,
    fieldKeyColumn: 'field_key',
    responseValueColumn: 'response_value'
  },
  open_banking: {
    fieldsTable: openBankingFields,
    responsesTable: openBankingResponses,
    fieldKeyColumn: 'field_key',
    responseValueColumn: 'response_value'
  }
};

const router = Router();
const logger = new Logger('UniversalDemoAutoFillRouter');

/**
 * Unified endpoint for demo auto-fill across all form types
 * This endpoint automatically detects the form type from the task
 * and uses the appropriate service to fill the form with demo data.
 */
router.post('/api/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    console.log('Universal demo auto-fill endpoint called:', {
      taskId: req.params.taskId,
      formType: req.body.formType || req.query.formType,
      taskType: req.body.taskType,
      user: req.user ? { id: req.user.id, email: req.user.email } : 'No user'
    });
    
    // Check user authentication
    if (!req.user || !req.user.id) {
      logger.error('Unauthenticated user attempted to access demo auto-fill');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    // Parse taskId from request parameters
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid task ID' 
      });
    }
    
    // Allow request to specify form type directly
    let formType = req.query.formType || req.body.formType;
    
    // Get the task to determine its form type
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error('Task not found for demo auto-fill', { taskId });
      return res.status(404).json({ 
        success: false,
        error: 'Task not found' 
      });
    }
    
    // SECURITY: Verify user belongs to the task's company
    if (req.user.company_id !== task.company_id) {
      logger.error('Security violation: User attempted to access task from another company', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        taskId: task.id,
        taskCompanyId: task.company_id
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this task'
      });
    }
    
    // If form type wasn't explicitly provided, detect it from the task type
    if (!formType) {
      formType = getFormTypeFromTaskType(task.task_type);
      
      if (!formType) {
        logger.error('Failed to determine form type for task', { 
          taskId, 
          taskType: task.task_type 
        });
        
        return res.status(400).json({
          success: false,
          error: 'Unknown form type',
          message: `Could not determine form type for task type: ${task.task_type}`
        });
      }
      
      logger.info('Auto-detected form type from task', { 
        taskId, 
        taskType: task.task_type, 
        formType 
      });
    }
    
    // Use the universal service to apply the demo data
    try {
      const result = await universalDemoAutoFillService.applyDemoData(
        taskId, 
        formType,
        req.user.id
      );
      
      logger.info('Successfully applied demo data', {
        taskId,
        formType,
        fieldCount: result.fieldCount
      });
      
      // Get the current form data to send back in the response
      // This will help the client correctly update the form without additional requests
      let formData = null;
      try {
        // Get form data directly from the database 
        const config = formTypeConfigs[formType];
        if (!config) {
          throw new Error(`Unknown form type: ${formType}`);
        }
        
        logger.info(`Fetching form data directly from database for ${formType} task ${taskId}`);
        
        // Get all responses for this task
        const responses = await db.select()
          .from(config.responsesTable)
          .where(eq(config.responsesTable.task_id, taskId));
          
        logger.info(`Found ${responses.length} response records for task ${taskId}`);
        
        // Get all field definitions
        const fields = await db.select()
          .from(config.fieldsTable);
        
        // Create a map of field IDs to field definitions for quick lookup
        const fieldMap = new Map();
        for (const field of fields) {
          fieldMap.set(field.id, field);
        }
        
        // Construct form data object from responses
        formData = {};
        for (const response of responses) {
          const field = fieldMap.get(response.field_id);
          if (field) {
            // Use the field key as the property name
            const fieldKey = field[config.fieldKeyColumn];
            const value = response[config.responseValueColumn] || '';
            
            // Add this field's value to the form data object
            formData[fieldKey] = value;
            
            logger.info(`Added ${fieldKey} = "${value}" (${response.status}) to form data`);
          }
        }
        
        logger.info(`Constructed form data with ${Object.keys(formData).length} fields`);
        
      } catch (formDataError) {
        logger.warn('Failed to get form data for response', {
          error: formDataError instanceof Error ? formDataError.message : String(formDataError),
          taskId,
          formType
        });
        
        // Fall back to using form-specific services if direct approach fails
        try {
          if (formType === 'kyb') {
            const kybService = require('../services/kybService');
            formData = await kybService.getKybFormData(taskId);
          } else if (formType === 'ky3p') {
            const ky3pService = require('../services/ky3pService');
            formData = await ky3pService.getKy3pFormData(taskId);
          } else if (formType === 'open_banking') {
            const obService = require('../services/openBankingService');
            formData = await obService.getOpenBankingFormData(taskId);
          }
        } catch (backupError) {
          logger.error('Failed to get form data using backup method', {
            error: backupError instanceof Error ? backupError.message : String(backupError),
            taskId,
            formType
          });
        }
      }

      // Return success information along with the current form data
      res.json({
        success: true,
        message: result.message,
        fieldCount: result.fieldCount,
        taskId,
        formType,
        formData: formData || null
      });
    } catch (serviceError) {
      // Handle specific errors from the service
      logger.error('Error from universal service', {
        error: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      });
      
      // Determine appropriate status code
      const statusCode = 
        serviceError instanceof Error && serviceError.message.includes('demo companies') ? 403 :
        serviceError instanceof Error && serviceError.message.includes('Task not found') ? 404 : 
        500;
      
      return res.status(statusCode).json({
        success: false,
        error: 'Failed to apply demo data',
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error'
      });
    }
  } catch (error) {
    logger.error('Error in universal demo auto-fill endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// For backward compatibility, add type-specific endpoints
router.post('/api/kyb/demo-autofill/:taskId', requireAuth, async (req, res) => {
  // Modify the request to include the form type
  req.body.formType = 'kyb';
  
  // Simply call the universal demo auto-fill service directly
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId) || !req.user) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }
    
    console.log('Legacy KYB demo-autofill endpoint called:', {
      taskId,
      formType: 'kyb',
      user: req.user.id
    });
    
    const result = await universalDemoAutoFillService.applyDemoData(
      taskId, 
      'kyb',
      req.user.id
    );
    
    // Get the current form data to send back in the response
    let formData = null;
    try {
      // Get form data directly from the database 
      const formType = 'kyb';
      const config = formTypeConfigs[formType];
      
      // Get all responses for this task
      const responses = await db.select()
        .from(config.responsesTable)
        .where(eq(config.responsesTable.task_id, taskId));
        
      console.log(`Found ${responses.length} response records for task ${taskId}`);
      
      // Get all field definitions
      const fields = await db.select()
        .from(config.fieldsTable);
      
      // Create a map of field IDs to field definitions for quick lookup
      const fieldMap = new Map();
      for (const field of fields) {
        fieldMap.set(field.id, field);
      }
      
      // Construct form data object from responses
      formData = {};
      for (const response of responses) {
        const field = fieldMap.get(response.field_id);
        if (field) {
          // Use the field key as the property name
          const fieldKey = field[config.fieldKeyColumn];
          const value = response[config.responseValueColumn] || '';
          
          // Add this field's value to the form data object
          formData[fieldKey] = value;
        }
      }
      
      console.log(`Constructed KYB form data with ${Object.keys(formData).length} fields`);
    } catch (formDataError) {
      console.warn('Failed to get KYB form data for response', formDataError);
      
      // Fall back to service if direct db approach fails
      try {
        const kybService = require('../services/kybService');
        formData = await kybService.getKybFormData(taskId);
      } catch (fallbackError) {
        console.error('Fallback KYB data fetch also failed', fallbackError);
      }
    }
    
    res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount,
      formData: formData || null
    });
  } catch (error) {
    console.error('Error in KYB demo-autofill:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  // Modify the request to include the form type
  req.body.formType = 'ky3p';
  
  // Simply call the universal demo auto-fill service directly
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId) || !req.user) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }
    
    console.log('Legacy KY3P demo-autofill endpoint called:', {
      taskId,
      formType: 'ky3p',
      user: req.user.id
    });
    
    const result = await universalDemoAutoFillService.applyDemoData(
      taskId, 
      'ky3p',
      req.user.id
    );
    
    // Get the current form data to send back in the response
    let formData = null;
    try {
      // Get form data directly from the database 
      const formType = 'ky3p';
      const config = formTypeConfigs[formType];
      
      // Get all responses for this task
      const responses = await db.select()
        .from(config.responsesTable)
        .where(eq(config.responsesTable.task_id, taskId));
        
      console.log(`Found ${responses.length} response records for task ${taskId}`);
      
      // Get all field definitions
      const fields = await db.select()
        .from(config.fieldsTable);
      
      // Create a map of field IDs to field definitions for quick lookup
      const fieldMap = new Map();
      for (const field of fields) {
        fieldMap.set(field.id, field);
      }
      
      // Construct form data object from responses
      formData = {};
      for (const response of responses) {
        const field = fieldMap.get(response.field_id);
        if (field) {
          // Use the field key as the property name
          const fieldKey = field[config.fieldKeyColumn];
          const value = response[config.responseValueColumn] || '';
          
          // Add this field's value to the form data object
          formData[fieldKey] = value;
        }
      }
      
      console.log(`Constructed KY3P form data with ${Object.keys(formData).length} fields`);
    } catch (formDataError) {
      console.warn('Failed to get KY3P form data for response', formDataError);
      
      // Fall back to service if direct db approach fails
      try {
        const ky3pService = require('../services/ky3pService');
        formData = await ky3pService.getKy3pFormData(taskId);
      } catch (fallbackError) {
        console.error('Fallback KY3P data fetch also failed', fallbackError);
      }
    }
    
    res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount,
      formData: formData || null
    });
  } catch (error) {
    console.error('Error in KY3P demo-autofill:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/api/open-banking/demo-autofill/:taskId', requireAuth, async (req, res) => {
  // Modify the request to include the form type
  req.body.formType = 'open_banking';
  
  // Simply call the universal demo auto-fill service directly
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId) || !req.user) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }
    
    console.log('Legacy Open Banking demo-autofill endpoint called:', {
      taskId,
      formType: 'open_banking',
      user: req.user.id
    });
    
    const result = await universalDemoAutoFillService.applyDemoData(
      taskId, 
      'open_banking',
      req.user.id
    );
    
    // Get the current form data to send back in the response
    let formData = null;
    try {
      // Get form data directly from the database 
      const formType = 'open_banking';
      const config = formTypeConfigs[formType];
      
      // Get all responses for this task
      const responses = await db.select()
        .from(config.responsesTable)
        .where(eq(config.responsesTable.task_id, taskId));
        
      console.log(`Found ${responses.length} response records for task ${taskId}`);
      
      // Get all field definitions
      const fields = await db.select()
        .from(config.fieldsTable);
      
      // Create a map of field IDs to field definitions for quick lookup
      const fieldMap = new Map();
      for (const field of fields) {
        fieldMap.set(field.id, field);
      }
      
      // Construct form data object from responses
      formData = {};
      for (const response of responses) {
        const field = fieldMap.get(response.field_id);
        if (field) {
          // Use the field key as the property name
          const fieldKey = field[config.fieldKeyColumn];
          const value = response[config.responseValueColumn] || '';
          
          // Add this field's value to the form data object
          formData[fieldKey] = value;
        }
      }
      
      console.log(`Constructed Open Banking form data with ${Object.keys(formData).length} fields`);
    } catch (formDataError) {
      console.warn('Failed to get Open Banking form data for response', formDataError);
      
      // Fall back to service if direct db approach fails
      try {
        const obService = require('../services/openBankingService');
        formData = await obService.getOpenBankingFormData(taskId);
      } catch (fallbackError) {
        console.error('Fallback Open Banking data fetch also failed', fallbackError);
      }
    }
    
    res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount,
      formData: formData || null
    });
  } catch (error) {
    console.error('Error in Open Banking demo-autofill:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;