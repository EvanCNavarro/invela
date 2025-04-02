import { Router } from 'express';
import { db } from '@db';
import { tasks, securityFields, securityResponses, TaskStatus } from '@db/schema';
import { eq, and, sql, ilike } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('SecurityRoutes');

// Get security task by company name
router.get('/api/tasks/security/:companyName', async (req, res) => {
  try {
    logger.info('Fetching security task:', {
      companyName: req.params.companyName,
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
    console.error('[Security Routes] Error fetching security task:', error);
    res.status(500).json({ message: "Failed to fetch security task" });
  }
});

// Get security fields
router.get('/api/security/fields', requireAuth, async (req, res) => {
  try {
    logger.info('Fetching security fields');
    const fields = await db.select().from(securityFields);
    res.json(fields);
  } catch (error) {
    logger.error('Error fetching security fields', {
      error: error instanceof Error ? error.message : 'Unknown error'
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
    logger.info('Fetching security responses', { companyId });
    
    const responses = await db.select()
      .from(securityResponses)
      .where(eq(securityResponses.company_id, parseInt(companyId)));
    
    res.json(responses);
  } catch (error) {
    logger.error('Error fetching security responses', {
      error: error instanceof Error ? error.message : 'Unknown error'
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
      hasResponse: !!response
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
        status: newStatus
      });
    }

    res.json(updatedResponse);
  } catch (error) {
    logger.error('Error saving security response', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      message: "Failed to save security response",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Submit security assessment form
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

    res.json({ message: 'Security assessment submitted successfully' });
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