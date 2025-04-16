/**
 * Enhanced debugging routes for KYB form data
 * These routes expose detailed debugging information
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks, kybFields, kybResponses } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { logTaskResponses, logFormDifferences } from './utils/form-debug';

const router = Router();

// Enhanced debug endpoint to get form data for a task
router.get('/api/debug/form/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskIdNum = parseInt(taskId);
    
    console.log(`[DEBUG API] Detailed form data request for task ${taskId}`);
    
    // Get comprehensive task data
    await logTaskResponses(taskIdNum);
    
    // Get database records
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskIdNum));
      
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Get all field responses
    const responses = await db.select({
      id: kybResponses.id,
      response_value: kybResponses.response_value,
      field_id: kybResponses.field_id,
      field_key: kybFields.field_key,
      status: kybResponses.status,
      version: kybResponses.version,
      updated_at: kybResponses.updated_at
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskIdNum));
    
    // Transform into formData format
    const formData: Record<string, any> = {};
    for (const response of responses) {
      if (response.response_value !== null) {
        formData[response.field_key] = response.response_value;
      }
    }
    
    // Check for "asdf" test values
    const asdfFields = responses
      .filter(r => r.response_value === 'asdf')
      .map(r => r.field_key);
    
    // Format response data for debugging
    const responseData = responses.map(r => ({
      id: r.id,
      field_key: r.field_key,
      field_id: r.field_id,
      value: r.response_value,
      status: r.status,
      version: r.version,
      updated_at: r.updated_at
    }));
    
    // Return comprehensive debug information
    res.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        progress: task.progress,
        created_at: task.created_at,
        updated_at: task.updated_at,
        metadata: task.metadata
      },
      formDataFields: Object.keys(formData).length,
      responseCount: responses.length,
      asdfFields: asdfFields,
      keysOfInterest: {
        corporateRegistration: formData['corporateRegistration'] || null,
        goodStanding: formData['goodStanding'] || null,
        regulatoryActions: formData['regulatoryActions'] || null,
        investigationsIncidents: formData['investigationsIncidents'] || null
      },
      // Include the full data for debugging
      formData: formData,
      responses: responseData
    });
  } catch (error) {
    console.error('[DEBUG API] Error in form data debug endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Debug endpoint to compare form data between test-form-update and database
router.get('/api/debug/form-sources/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskIdNum = parseInt(taskId);
    
    console.log(`[DEBUG API] Form data source comparison for task ${taskId}`);
    
    // Get the current database state of the form
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskIdNum));
    
    // Transform into formData format
    const dbFormData: Record<string, any> = {};
    for (const response of responses) {
      if (response.response_value !== null) {
        dbFormData[response.field_key] = response.response_value;
      }
    }
    
    // Check fields that use "asdf" in the database
    const dbAsdfFields = Object.entries(dbFormData)
      .filter(([_, value]) => value === 'asdf')
      .map(([key]) => key);
    
    // Return the database state
    res.json({
      taskId: taskIdNum,
      databaseForm: {
        fieldCount: Object.keys(dbFormData).length,
        asdfFields: dbAsdfFields,
        data: dbFormData
      },
      keysOfInterest: {
        corporateRegistration: dbFormData['corporateRegistration'] || null,
        goodStanding: dbFormData['goodStanding'] || null,
        regulatoryActions: dbFormData['regulatoryActions'] || null,
        investigationsIncidents: dbFormData['investigationsIncidents'] || null
      }
    });
  } catch (error) {
    console.error('[DEBUG API] Error in form sources debug endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;