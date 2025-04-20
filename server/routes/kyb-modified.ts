import { Router } from 'express';
import { join } from 'path';
import { db } from '@db';
import { tasks, TaskStatus, kybFields, kybResponses, files, companies } from '@db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { FileCreationService } from '../services/file-creation';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate, broadcastMessage, broadcastSubmissionStatus } from '../services/websocket';

const logger = new Logger('KYBRoutes');

// Save KYB form data with WebSocket broadcasting
router.post('/api/kyb/save', async (req, res) => {
  try {
    // Enhanced detailed DEBUG entry point logging
    console.log('[KYB API Debug] KYB save endpoint triggered:', {
      endpoint: '/api/kyb/save',
      method: 'POST',
      url: req.url,
      headers: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        cookie: !!req.headers.cookie // Just log if cookie is present without exposing its value
      },
      timestamp: new Date().toISOString()
    });
    
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      console.error('[KYB API Debug] Unauthorized access attempt', {
        path: '/api/kyb/save',
        authenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        hasSession: !!req.session,
        sessionID: req.sessionID,
        cookiePresent: !!req.headers.cookie,
        timestamp: new Date().toISOString()
      });
      
      // Send a more detailed 401 response
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to save KYB data',
        details: {
          authenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          hasSession: !!req.session,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // If authenticated, log user details
    console.log('[KYB API Debug] User authenticated:', {
      userId: req.user.id,
      userEmail: req.user.email,
      companyId: req.user.company_id,
      timestamp: new Date().toISOString()
    });

    const { fileName, formData, taskId, status } = req.body;
    
    // Check if this is a submission (client indicates "submitted" status)
    const isSubmission = status === 'submitted';

    logger.debug('Save request received', {
      taskId,
      formDataKeys: Object.keys(formData),
      fileName,
      userId: req.user.id,
      isSubmission,
      requestedStatus: status
    });

    // Get task details with full task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error('Task not found');
    }

    // If created_by is missing, use the current user's ID
    if (!task.created_by && req.user?.id) {
      await db.update(tasks)
        .set({ 
          created_by: req.user.id,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));

      task.created_by = req.user.id;
    }

    // Still check for required fields after potential update
    if (!task.created_by || !task.company_id) {
      throw new Error('Missing task user or company information');
    }

    // Get all KYB fields with their groups
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);

    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);

    // Create file using FileCreationService
    const fileCreationResult = await FileCreationService.createFile({
      name: fileName || FileCreationService.generateStandardFileName("KYBForm", taskId, task.metadata?.company_name, task.metadata?.formVersion || "1.0", "csv"),
      content: csvData,
      type: 'text/csv',
      userId: task.created_by,
      companyId: task.company_id,
      metadata: {
        taskId,
        taskType: 'kyb',
        formVersion: '1.0',
        submissionDate: new Date().toISOString(),
        fields: fields.map(f => f.field_key)
      },
      status: 'uploaded'
    });

    if (!fileCreationResult.success) {
      logger.error('File creation failed', {
        error: fileCreationResult.error,
        taskId,
        fileName
      });
      throw new Error(fileCreationResult.error);
    }

    // Get company record to update available tabs
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));

    if (company) {
      // Add file-vault to available tabs if not already present
      const currentTabs = company.available_tabs || ['task-center'];
      if (!currentTabs.includes('file-vault')) {
        await db.update(companies)
          .set({ 
            available_tabs: [...currentTabs, 'file-vault'],
            updated_at: new Date()
          })
          .where(eq(companies.id, task.company_id));
      }
    }

    // Update task status and metadata
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          kybFormFile: fileCreationResult.fileId,
          submissionDate: new Date().toISOString(),
          formVersion: '1.0',
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
            .filter((v, i, a) => a.indexOf(v) === i)
        }
      })
      .where(eq(tasks.id, taskId));
      
    // Broadcast submission status via WebSocket to ensure all clients
    // receive notification, even if HTTP response fails
    console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted`);
    broadcastSubmissionStatus(taskId, 'submitted');
      
    // Also broadcast the task update for dashboard real-time updates
    broadcastTaskUpdate({
      id: taskId,
      status: TaskStatus.SUBMITTED,
      progress: 100,
      metadata: {
        lastUpdated: new Date().toISOString(),
        submissionDate: new Date().toISOString()
      }
    });

    let warnings = [];
    // Save responses to database
    for (const field of fields) {
      const value = formData[field.field_key];
      const status = value ? 'COMPLETE' : 'EMPTY';

      try {
        // First try to insert
        await db.insert(kybResponses)
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
          await db.update(kybResponses)
            .set({
              response_value: value || null,
              status,
              version: sql`${kybResponses.version} + 1`,
              updated_at: new Date()
            })
            .where(
              and(
                eq(kybResponses.task_id, taskId),
                eq(kybResponses.field_id, field.id)
              )
            );
          warnings.push(`Updated existing response for field: ${field.field_key}`);
        } else {
          throw error;
        }
      }
    }

    logger.info('Save completed successfully', {
      taskId,
      fileId: fileCreationResult.fileId,
      responseCount: fields.length,
      warningCount: warnings.length
    });

    res.json({
      success: true,
      fileId: fileCreationResult.fileId,
      warnings: warnings.length ? warnings : undefined
    });
  } catch (error) {
    // Enhanced detailed error logging
    console.error('[KYB API Debug] Error saving KYB form', {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      requestHeaders: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        cookiePresent: !!req.headers.cookie
      },
      sessionID: req.sessionID,
      authenticatedStatus: req.isAuthenticated(),
      userPresent: !!req.user,
      timestamp: new Date().toISOString()
    });
    
    logger.error('Error saving KYB form', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Set appropriate status code based on error type
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        statusCode = 404;
      } else if (error.message.includes('Unauthorized') || error.message.includes('unauthenticated')) {
        statusCode = 401;
      } else if (error.message.includes('Invalid') || error.message.includes('validation')) {
        statusCode = 400;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      code: statusCode === 500 ? 'INTERNAL_ERROR' : 
            statusCode === 404 ? 'NOT_FOUND' :
            statusCode === 401 ? 'UNAUTHORIZED' : 'BAD_REQUEST'
    });
  }
});