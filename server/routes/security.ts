import { Router } from 'express';
import { db } from '@db';
import { tasks, securityFields, securityResponses, TaskStatus, companies, files } from '@db/schema';
import { eq, and, sql, ilike } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
// Add namespace context to logs
const logContext = { service: 'SecurityRoutes' };

// Get security task by company name
router.get('/api/tasks/security/:companyName', requireAuth, async (req, res) => {
  try {
    logger.info('Fetching security task:', {
      companyName: req.params.companyName,
      userId: req.user?.id,
      companyId: req.user?.company_id
    });

    // Try to find with the new numbered format first, then fall back to the old format
    let task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.task_type, 'security_assessment'),
        ilike(tasks.title, `2. Security Assessment: ${req.params.companyName}`)
      )
    });
    
    // If not found, try the old format
    if (!task) {
      task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.task_type, 'security_assessment'),
          ilike(tasks.title, `Security Assessment: ${req.params.companyName}`)
        )
      });
    }

    logger.info('Security task found:', task);

    if (!task) {
      return res.status(404).json({ 
        message: `Could not find Security task for company: ${req.params.companyName}` 
      });
    }

    // Get the security form data if any exists
    if (task.company_id) {
      const responses = await db.select()
        .from(securityResponses)
        .where(eq(securityResponses.company_id, task.company_id));

      if (responses.length > 0) {
        const formData: Record<string, any> = {};
        responses.forEach(response => {
          formData[`field_${response.field_id}`] = response.response;
        });
        
        // Create a new task object with savedFormData
        // We're using a type assertion here since we're manually adding savedFormData
        // which isn't part of the formal task schema
        task = {
          ...task,
          savedFormData: formData
        } as typeof task & { savedFormData: Record<string, any> };
      }
    }

    res.json(task);
  } catch (error) {
    logger.error('Error fetching security task', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...logContext
    });
    res.status(500).json({ message: "Failed to fetch security task" });
  }
});

// Get security fields
router.get('/api/security/fields', requireAuth, async (req, res) => {
  try {
    logger.info('Fetching security fields', { ...logContext });
    const fields = await db.select().from(securityFields);
    res.json(fields);
  } catch (error) {
    logger.error('Error fetching security fields', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...logContext
    });
    res.status(500).json({
      message: "Failed to fetch security fields",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get security responses for a company
router.get('/api/security/responses/:companyId', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    logger.info('Fetching security responses', { companyId, ...logContext });
    
    const responses = await db.select()
      .from(securityResponses)
      .where(eq(securityResponses.company_id, parseInt(companyId)));
    
    res.json(responses);
  } catch (error) {
    logger.error('Error fetching security responses', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...logContext
    });
    res.status(500).json({
      message: "Failed to fetch security responses",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Save/update a security response
router.post('/api/security/response/:companyId/:fieldId', requireAuth, async (req, res) => {
  try {
    const { companyId, fieldId } = req.params;
    const { response } = req.body;

    logger.info('Saving security response', {
      companyId,
      fieldId,
      hasResponse: !!response,
      ...logContext
    });

    // First check if response exists
    const existingResponse = await db.select()
      .from(securityResponses)
      .where(and(
        eq(securityResponses.company_id, parseInt(companyId)),
        eq(securityResponses.field_id, parseInt(fieldId))
      ))
      .limit(1);

    let updatedResponse;

    if (existingResponse.length > 0) {
      // Update existing response
      [updatedResponse] = await db.update(securityResponses)
        .set({
          response: response,
          status: response ? 'completed' : 'pending',
          updated_at: new Date()
        })
        .where(and(
          eq(securityResponses.company_id, parseInt(companyId)),
          eq(securityResponses.field_id, parseInt(fieldId))
        ))
        .returning();
    } else {
      // Insert new response
      [updatedResponse] = await db.insert(securityResponses)
        .values({
          company_id: parseInt(companyId),
          field_id: parseInt(fieldId),
          response: response,
          status: response ? 'completed' : 'pending',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
    }

    // Update the task progress
    // First find the security assessment task for this company
    const securityTask = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.company_id, parseInt(companyId)),
        eq(tasks.task_type, 'security_assessment')
      )
    });

    if (securityTask) {
      // Calculate progress
      const totalFields = await db.select({ count: sql<number>`count(*)` })
        .from(securityFields)
        .then(result => result[0].count);

      const completedFields = await db.select({ count: sql<number>`count(*)` })
        .from(securityResponses)
        .where(and(
          eq(securityResponses.company_id, parseInt(companyId)),
          eq(securityResponses.status, 'completed')
        ))
        .then(result => result[0].count);

      const progress = Math.round((completedFields / totalFields) * 100);

      // Determine task status based on progress
      let newStatus;
      if (progress === 0) {
        newStatus = TaskStatus.NOT_STARTED;
      } else if (progress === 100) {
        newStatus = TaskStatus.READY_FOR_SUBMISSION;
      } else {
        newStatus = TaskStatus.IN_PROGRESS;
      }

      // Update task progress
      await db.update(tasks)
        .set({
          progress: progress,
          status: newStatus,
          updated_at: new Date()
        })
        .where(eq(tasks.id, securityTask.id));

      logger.info('Updated task progress', {
        taskId: securityTask.id,
        progress,
        status: newStatus,
        ...logContext
      });
    }

    res.json(updatedResponse);
  } catch (error) {
    logger.error('Error saving security response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...logContext
    });
    res.status(500).json({
      message: "Failed to save security response",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Helper function to convert security responses to CSV
function convertSecurityResponsesToCSV(fields: any[], responses: any[]) {
  // CSV headers
  const headers = ['Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];

  // Create a map of responses by field_id for easy lookup
  const responseMap = new Map();
  responses.forEach(response => {
    responseMap.set(response.field_id, response.response);
  });

  // Add data rows
  for (const field of fields) {
    rows.push([
      field.domain || 'Uncategorized',
      field.question,
      responseMap.get(field.id) || 'Not provided',
      field.field_type || 'TEXT'
    ]);
  }

  // Convert to CSV string
  return rows.map(row =>
    row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  ).join('\n');
}

// We're keeping the old endpoint for backward compatibility, but making a new one that matches
// the client-side API pattern we use for KYB.

// Submit security assessment form (new standardized endpoint)
router.post('/api/security/save', requireAuth, async (req, res) => {
  try {
    // Enhanced logging
    logger.info('Security save endpoint triggered', {
      endpoint: '/api/security/save',
      method: 'POST',
      headers: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        cookiePresent: !!req.headers.cookie
      },
      timestamp: new Date().toISOString(),
      ...logContext
    });
    
    // Extract request body fields
    const { taskId, formData, fileName } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Missing required parameter: taskId' 
      });
    }
    
    logger.info('Saving security assessment', { taskId, fileName, ...logContext });
    
    // Rest of the submission logic is identical to the older endpoint
    // Continue with your existing implementation here...
    
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, parseInt(taskId.toString()))
    });
    
    if (!task) {
      logger.error('Task not found for security assessment submission', { taskId });
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (!task.company_id) {
      logger.error('Task has no company_id', { taskId });
      return res.status(400).json({ message: 'Task is not associated with a company' });
    }
    
    // Continue with the rest of the submission logic...
    // We'll extract this to a shared function later
    
    return processSecuritySubmission(req, res, task, formData, fileName);
  } catch (error) {
    logger.error('Error saving security assessment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      error: 'Failed to save security assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function for processing security submissions
async function processSecuritySubmission(req, res, task, formData, fileName) {
  try {
    // Get all security fields
    const fields = await db.select().from(securityFields);
    
    // Get existing responses
    const existingResponses = await db.select()
      .from(securityResponses)
      .where(eq(securityResponses.company_id, task.company_id));
    
    // Process the responses and generate the CSV data
    // This will be implemented similar to the KYB convertResponsesToCSV function
    const csvRows = [];
    const headers = ['Field', 'Question', 'Response', 'Score', 'Max Score'];
    csvRows.push(headers.join(','));
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    // Process responses
    for (const field of fields) {
      const value = formData[field.field_key] || '';
      const existingResponse = existingResponses.find(r => r.field_id === field.id);
      
      let score = 0;
      if (typeof value === 'string' && field.scoring_rules && field.scoring_rules.values) {
        score = field.scoring_rules.values[value] || 0;
      }
      
      totalScore += score;
      maxPossibleScore += field.max_score || 0;
      
      const row = [
        field.field_key,
        (field.question || '').replace(/,/g, ' '),
        (value || '').replace(/,/g, ' '),
        score.toString(),
        (field.max_score || 0).toString()
      ];
      
      csvRows.push(row.join(','));
    }
    
    // Calculate the risk score
    const riskScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    
    // Create the CSV file
    const csvData = csvRows.join('\n');
    const timestamp = new Date();
    const safeFileName = fileName || `security_assessment_${task.id}_${timestamp.toISOString().replace(/:/g, '')}.csv`;
    
    // Save the file to the database
    const userId = req.user?.id || task.created_by;
    if (!userId) {
      logger.error('Unable to determine user ID for file creation', {
        taskId: task.id,
        userIdFromRequest: req.user?.id,
        userIdFromTask: task.created_by,
      });
      // Return proper error response instead of throwing
      return res.status(400).json({
        error: 'User identification failed',
        details: 'Could not determine a valid user ID for file creation'
      });
    }

    // Use a transaction to ensure all operations succeed or fail together
    try {
      // Start a transaction
      const fileId = await db.transaction(async (tx) => {
        // 1. Insert the file record
        const [fileRecord] = await tx.insert(files)
          .values({
            name: safeFileName,
            content: csvData,
            type: 'text/csv',
            status: 'active',
            path: `/uploads/security_${task.id}_${timestamp.getTime()}.csv`,
            size: Buffer.from(csvData).length,
            version: 1,
            company_id: task.company_id,
            user_id: userId, // Set this explicitly from authenticated user or task creator
            created_by: userId, // Keep consistency with user_id
            created_at: timestamp,
            updated_at: timestamp,
            metadata: {
              taskId: task.id,
              taskType: 'security',
              formVersion: '1.0',
              submissionDate: timestamp.toISOString(),
              riskScore
            }
          })
          .returning({ id: files.id });
          
        // 2. Update the task
        await tx.update(tasks)
          .set({
            status: TaskStatus.SUBMITTED,
            progress: 100,
            updated_at: new Date(),
            metadata: {
              ...task.metadata,
              securityFormFile: fileRecord.id,
              submissionDate: new Date().toISOString(),
              riskScore
            }
          })
          .where(eq(tasks.id, task.id));
          
        // 3. Update company data
        const [company] = await tx.select()
          .from(companies)
          .where(eq(companies.id, task.company_id));
        
        if (company) {
          // Update company risk score and available tabs
          const currentTabs = company.available_tabs || ['task-center'];
          const updates: any = { 
            risk_score: riskScore,
            updated_at: new Date()
          };
          
          if (!currentTabs.includes('file-vault')) {
            updates.available_tabs = [...currentTabs, 'file-vault'];
          }
          
          await tx.update(companies)
            .set(updates)
            .where(eq(companies.id, task.company_id));
        }
        
        // Return the file ID from the transaction
        return fileRecord.id;
      });
      
      logger.info('Security assessment submitted successfully', {
        taskId: task.id,
        fileId,
        riskScore
      });
      
      return res.json({
        success: true,
        fileId,
        riskScore
      });
      
    } catch (txError) {
      // If transaction fails, log and return a proper error response
      logger.error('Transaction failed during security submission', {
        error: txError instanceof Error ? txError.message : 'Unknown error',
        stack: txError instanceof Error ? txError.stack : undefined
      });
      
      return res.status(500).json({
        error: 'Transaction failed',
        details: txError instanceof Error ? txError.message : 'Failed to complete the submission process'
      });
    }
    
  } catch (error) {
    logger.error('Error processing security submission', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return proper error response instead of throwing
    return res.status(500).json({
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}

// Submit security assessment form (legacy endpoint)
router.post('/api/security/submit/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    logger.info('Submitting security assessment', { taskId });

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, parseInt(taskId))
    });

    if (!task) {
      logger.error('Task not found for security assessment submission', { taskId });
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.company_id) {
      logger.error('Task has no company_id', { taskId });
      return res.status(400).json({ message: 'Task is not associated with a company' });
    }

    // First, ensure all fields have responses
    // Get all security fields
    const fields = await db.select().from(securityFields);
    
    // Get existing responses
    const existingResponses = await db.select()
      .from(securityResponses)
      .where(eq(securityResponses.company_id, task.company_id));

    // Create blank responses for any missing fields
    const existingFieldIds = new Set(existingResponses.map(r => r.field_id));
    const missingFields = fields.filter(f => !existingFieldIds.has(f.id));
    const timestamp = new Date();

    if (missingFields.length > 0) {
      logger.info('Creating responses for missing fields', { 
        taskId,
        count: missingFields.length,
        companyId: task.company_id
      });

      for (const field of missingFields) {
        await db.insert(securityResponses)
          .values({
            company_id: task.company_id,
            field_id: field.id,
            response: "Not provided",
            status: 'completed',
            created_at: timestamp,
            updated_at: timestamp
          });
      }
    }

    // Get all responses including any we just added
    const allResponses = await db.select()
      .from(securityResponses)
      .where(eq(securityResponses.company_id, task.company_id));

    // Convert responses to CSV format
    const csvData = convertSecurityResponsesToCSV(fields, allResponses);
    
    // Import the FileCreationService
    const { FileCreationService } = await import('../services/file-creation');
    
    // Create file in the file vault
    const fileName = `security_assessment_${taskId}_${new Date().toISOString()}.csv`;
    const userId = req.user?.id || task.created_by;
    if (!userId) {
      logger.error('Unable to determine user ID for file creation', {
        taskId,
        userIdFromRequest: req.user?.id,
        userIdFromTask: task.created_by,
      });
      throw new Error('No valid user ID available for file creation');
    }
    
    const fileCreationResult = await FileCreationService.createFile({
      name: fileName,
      content: csvData,
      type: 'text/csv',
      userId: userId, // Use the validated userId
      companyId: task.company_id,
      metadata: {
        taskId,
        taskType: 'security_assessment',
        formVersion: '1.0',
        submissionDate: new Date().toISOString(),
        fields: fields.map(f => f.field_key)
      },
      status: 'uploaded'
    });

    if (!fileCreationResult.success) {
      logger.error('Security assessment file creation failed', {
        error: fileCreationResult.error,
        taskId,
        fileName
      });
      // Continue with task updates even if file creation fails
    } else {
      logger.info('Security assessment file created successfully', {
        fileId: fileCreationResult.fileId,
        taskId
      });
    }

    // Update task status to SUBMITTED
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: new Date()
      })
      .where(eq(tasks.id, parseInt(taskId)));

    // Check and update prerequisites for the CARD task
    // Find the CARD task that has this security task as a prerequisite
    const cardTask = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.company_id, task.company_id),
        eq(tasks.task_type, 'company_card')
      )
    });

    if (cardTask && cardTask.metadata && typeof cardTask.metadata === 'object') {
      const metadata = cardTask.metadata as Record<string, any>;
      
      if (metadata.locked === true && metadata.prerequisite_task_id === parseInt(taskId)) {
        // Unlock the CARD task
        await db.update(tasks)
          .set({
            status: TaskStatus.NOT_STARTED,
            metadata: {
              ...metadata,
              locked: false,
              unlocked_at: new Date().toISOString()
            },
            updated_at: new Date()
          })
          .where(eq(tasks.id, cardTask.id));

        logger.info('Unlocked CARD task', { 
          securityTaskId: taskId,
          cardTaskId: cardTask.id,
          companyId: task.company_id
        });
      }
    }

    // Add file-vault to available tabs if not already present
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));

    if (company && company.available_tabs) {
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

    res.json({ 
      message: 'Security assessment submitted successfully',
      fileId: fileCreationResult.success ? fileCreationResult.fileId : undefined
    });
  } catch (error) {
    logger.error('Error submitting security assessment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: req.params.taskId
    });
    res.status(500).json({
      message: "Failed to submit security assessment",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;