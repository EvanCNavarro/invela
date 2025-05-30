/**
 * KY3P Form Routes
 * 
 * Enhanced routes for handling KY3P form submissions with reliable file generation
 * and proper file tracking for inclusion in the File Vault UI.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks, ky3pFields, ky3pResponses, files, companies } from '@db/schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import * as FileCreationService from '../services/fileCreation';
import { logger } from '../utils/logger';
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import { requireAuth } from '../middleware/auth';

// Logger is already initialized in the imported module

// Helper function to convert responses to CSV
function convertResponsesToCSV(fields: any[], formData: any) {
  logger.info('[CSV Generation] Starting CSV conversion with', { 
    fieldsCount: fields.length, 
    formDataKeys: Object.keys(formData) 
  });
  
  // CSV headers
  const headers = ['Question Number', 'Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];

  // Add data rows
  let questionNumber = 1;
  const totalQuestions = fields.length;
  
  for (const field of fields) {
    // Skip fields without a valid field_key
    if (!field.field_key) {
      logger.info('[CSV Generation] Skipping field without field_key:', field);
      continue;
    }
    
    // Just use the number itself (1, 2, 3, etc.) instead of fraction format
    const formattedNumber = `${questionNumber}`;
    
    const answer = formData[field.field_key] || '';
    
    rows.push([
      formattedNumber,
      field.group || 'Uncategorized',
      field.display_name || field.label || field.question || field.field_key,
      answer,
      field.field_type || 'text'
    ]);
    
    questionNumber++;
  }

  // Convert to CSV string - properly handle all special characters
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Properly escape cells with special characters (commas, quotes, newlines)
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`; // Double quotes to escape quotes
      }
      return String(cell); // Ensure all values are strings
    }).join(',')
  ).join('\n');
  
  logger.info('[CSV Generation] CSV generation complete', {
    rowCount: rows.length,
    byteSize: Buffer.from(csvContent).length
  });
  
  return csvContent;
}

const router = Router();

/**
 * Enhanced KY3P form submission endpoint
 * 
 * This endpoint provides improved handling for KY3P form submissions,
 * ensuring files are properly created and linked to tasks, which makes
 * them visible in the File Vault UI.
 */
router.post('/enhanced-submit/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { formData } = req.body;
  
  if (!taskId || isNaN(taskId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid task ID'
    });
  }
  
  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Form data is required'
    });
  }
  
  const userId = req.user!.id;
  
  try {
    logger.info('Processing enhanced KY3P form submission', {
      taskId,
      userId,
      formDataKeys: Object.keys(formData).length
    });
    
    // Get the task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error('Task not found', { taskId });
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    if (task.task_type !== 'ky3p' && task.task_type !== 'sp_ky3p_assessment') {
      logger.error('Invalid task type for KY3P form submission', {
        taskId,
        taskType: task.task_type
      });
      
      return res.status(400).json({
        success: false,
        error: `Invalid task type: ${task.task_type}. Expected 'ky3p' or 'sp_ky3p_assessment'`
      });
    }
    
    // Get KY3P fields
    const fields = await db.select()
      .from(ky3pFields)
      .orderBy(ky3pFields.id);
      
    if (!fields || fields.length === 0) {
      logger.error('No KY3P fields found in database');
      return res.status(500).json({
        success: false,
        error: 'No KY3P fields found in database'
      });
    }
    
    logger.info('Found KY3P fields', { count: fields.length });
    
    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);
    
    // Create file using FileCreationService
    const fileName = `KY3PAssessment_${taskId}_${task.company_id}_v${task.metadata?.formVersion || '1.0'}.csv`;
    
    const fileCreationResult = await FileCreationService.createFile({
      name: fileName,
      content: csvData,
      type: 'text/csv',
      userId: userId,
      companyId: task.company_id,
      metadata: {
        taskId,
        taskType: 'ky3p',
        formVersion: '1.0',
        submissionDate: new Date().toISOString(),
        fields: fields.map(f => f.field_key)
      },
      status: 'uploaded'
    });
    
    if (!fileCreationResult.success) {
      logger.error('Enhanced file creation failed', {
        error: fileCreationResult.error,
        taskId,
        fileName
      });
      
      return res.status(500).json({
        success: false,
        error: 'File creation failed: ' + (fileCreationResult.error || 'Unknown error')
      });
    }
    
    // Update task status and link file
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        completion_date: new Date(),
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          last_updated: new Date().toISOString(),
          submission_timestamp: new Date().toISOString(),
          status_flow: [...(task.metadata?.status_flow || []), 'submitted'],
          fileId: fileCreationResult.fileId,
          fileName: fileName,
          ky3pFormFile: fileCreationResult.fileId, // Standard field name used in File Vault
          formFile: fileCreationResult.fileId, // Another variant used in some places
          progressHistory: [
            ...(task.metadata?.progressHistory || []),
            { value: 100, timestamp: new Date().toISOString() }
          ]
        }
      })
      .where(eq(tasks.id, taskId));
      
    // Add the task ID to the file metadata too for bidirectional linking
    await db.update(files)
      .set({
        metadata: {
          taskId,
          taskType: 'ky3p',
          companyId: task.company_id,
          submissionDate: new Date().toISOString()
        }
      })
      .where(eq(files.id, Number(fileCreationResult.fileId)));
    
    // Save responses to database
    for (const field of fields) {
      const value = formData[field.field_key];
      const status = value ? 'COMPLETE' : 'EMPTY';
      
      try {
        // First try to insert
        await db.insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: field.id,
            response_value: value || null,
            status,
            version: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('duplicate key value violates unique constraint')) {
          // If duplicate, update instead
          await db.update(ky3pResponses)
            .set({
              response_value: value || null,
              status,
              version: sql`${ky3pResponses.version} + 1`,
              updated_at: new Date()
            })
            .where(
              and(
                eq(ky3pResponses.task_id, taskId),
                eq(ky3pResponses.field_id, field.id)
              )
            );
        } else {
          throw error;
        }
      }
    }
    
    // Broadcast task update via WebSocket
    broadcastTaskUpdate(taskId, 'submitted', {
      fileId: fileCreationResult.fileId,
      fileName
    });
    
    logger.info('Enhanced KY3P form submission processed', {
      taskId,
      fileId: fileCreationResult.fileId,
      status: 'submitted'
    });
    
    // Get the company's tabs to check if the File Vault tab is available
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));
      
    let availableTabs = [];
    if (company && company.metadata && Array.isArray(company.metadata.available_tabs)) {
      availableTabs = company.metadata.available_tabs;
      
      // If File Vault tab not yet available, add it
      if (!availableTabs.includes('file-vault')) {
        availableTabs.push('file-vault');
        
        // Update company with new tabs
        await db.update(companies)
          .set({
            metadata: {
              ...company.metadata,
              available_tabs: availableTabs
            }
          })
          .where(eq(companies.id, task.company_id));
          
        // Broadcast company update to refresh UI
        WebSocketService.broadcastCompanyUpdate(task.company_id, {
          availableTabs
        });
        
        logger.info('File Vault tab unlocked for company', {
          companyId: task.company_id,
          availableTabs
        });
      }
    }
    
    return res.json({
      success: true,
      fileId: fileCreationResult.fileId,
      taskStatus: 'submitted',
      message: 'KY3P form submitted successfully with enhanced tracking',
      availableTabs
    });
  } catch (error) {
    logger.error('Error in enhanced KY3P form submission', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false, 
      error: 'Enhanced KY3P form submission failed: ' + 
        (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

export default router;