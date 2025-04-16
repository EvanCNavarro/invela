/**
 * Enhanced debugging routes for KYB form data
 * These routes expose detailed debugging information
 */
import { Router, Request, Response } from 'express';
import { db } from '@db';
import { eq, desc, sql, and } from 'drizzle-orm';
import { tasks, kybFields, kybResponses } from '@db/schema';
import { LoggingService } from '../server/services/logging-service';

const logger = new LoggingService('DebugAPI');
const router = Router();

// Helper to check if a field contains "asdf" test value
const isTestValue = (value: string | null): boolean => {
  if (!value) return false;
  
  // "asdf" is a common test value pattern that can cause issues
  return value.toLowerCase() === 'asdf';
};

/**
 * Enhanced debugging endpoint for form data
 * This provides detailed information about response data for a given task
 */
router.get('/form/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Get task information
    const taskInfo = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskInfo) {
      return res.status(404).json({ error: `Task with ID ${taskId} not found` });
    }
    
    // Get all form fields - KYB fields are global, not per task
    const formFields = await db.query.kybFields.findMany();
    
    // Get all form responses for the task
    const formResponses = await db.query.kybResponses.findMany({
      where: eq(kybResponses.task_id, taskId),
      orderBy: [desc(kybResponses.version)]
    });
    
    // Track important fields (fields that might have test data)
    const keysOfInterest = {
      corporateRegistration: null as string | null,
      goodStanding: null as string | null,
      regulatoryActions: null as string | null,
      investigationsIncidents: null as string | null
    };
    
    // Group responses by field_id to get the latest response for each field
    const latestResponses = formResponses.reduce((latest, response) => {
      // Find the field key for this response
      const fieldInfo = formFields.find(f => f.id === response.field_id);
      
      if (!fieldInfo) return latest;
      
      const fieldKey = fieldInfo.field_key;
      
      // Check if we've already seen this field, and if the current response is newer
      if (!latest[fieldKey] || response.version > latest[fieldKey].version) {
        latest[fieldKey] = {
          field_key: fieldKey,
          value: response.response_value,
          status: response.status,
          version: response.version,
          updated_at: response.updated_at?.toISOString() || 'unknown'
        };
        
        // Track fields of interest
        if (fieldKey === 'corporateRegistration') {
          keysOfInterest.corporateRegistration = response.response_value;
        } else if (fieldKey === 'goodStanding') {
          keysOfInterest.goodStanding = response.response_value;
        } else if (fieldKey === 'regulatoryActions') {
          keysOfInterest.regulatoryActions = response.response_value;
        } else if (fieldKey === 'investigationsIncidents') {
          keysOfInterest.investigationsIncidents = response.response_value;
        }
      }
      
      return latest;
    }, {} as Record<string, any>);
    
    // Convert to array for the frontend
    const responseArray = Object.values(latestResponses);
    
    // Convert to a simple form data object for debugging
    const formData = responseArray.reduce((data, field: any) => {
      data[field.field_key] = field.value;
      return data;
    }, {} as Record<string, string>);
    
    // Check for "asdf" test values
    const asdfFields = responseArray
      .filter((field: any) => isTestValue(field.value))
      .map((field: any) => field.field_key);
    
    logger.info(`Debug endpoint accessed for task ${taskId}`, {
      asdfFieldCount: asdfFields.length,
      responseCount: responseArray.length
    });
    
    return res.json({
      task: taskInfo,
      formDataFields: formFields.length, 
      responseCount: formResponses.length,
      asdfFields,
      keysOfInterest,
      formData,
      responses: responseArray
    });
  } catch (error) {
    logger.error('Error in form debug endpoint', { error });
    return res.status(500).json({ 
      error: 'Error retrieving debug information',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * List all tasks with form issues (test values, etc.)
 */
router.get('/tasks-with-issues', async (req: Request, res: Response) => {
  try {
    // Get all form responses containing "asdf"
    const problematicResponses = await db.execute(sql`
      SELECT 
        kr.task_id, 
        kf.field_key,
        kr.response_value,
        t.title
      FROM kyb_responses kr
      JOIN kyb_fields kf ON kr.field_id = kf.id
      JOIN tasks t ON kr.task_id = t.id
      WHERE LOWER(kr.response_value) = 'asdf'
      ORDER BY kr.task_id
    `);
    
    // Group by task ID to create a summary
    const taskSummary = {};
    
    for (const row of problematicResponses as any[]) {
      if (!taskSummary[row.task_id]) {
        taskSummary[row.task_id] = {
          taskId: row.task_id,
          title: row.title,
          testFields: []
        };
      }
      
      taskSummary[row.task_id].testFields.push({
        fieldKey: row.field_key,
        value: row.response_value
      });
    }
    
    return res.json({
      tasksWithIssues: Object.values(taskSummary)
    });
  } catch (error) {
    logger.error('Error checking for tasks with issues', { error });
    return res.status(500).json({ 
      error: 'Error checking for tasks with issues',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;