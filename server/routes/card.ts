import { Router } from 'express';
import { db } from '@db';
import { tasks, cardFields, cardResponses, files, TaskStatus } from '@db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { analyzeCardResponse } from '../services/openai';
import { updateCompanyRiskScore } from '../services/riskScore';
import { updateCompanyAfterCardCompletion } from '../services/company';
import { FileCreationService } from '../services/file-creation';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('CardRoutes');

// Get CARD task by company name
router.get('/api/tasks/card/:companyName', requireAuth, async (req, res) => {
  try {
    logger.info('Fetching CARD task', {
      companyName: req.params.companyName,
      userId: req.user?.id,
      companyId: req.user?.company_id
    });

    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.task_type, 'company_card'),
        ilike(tasks.title, `Company CARD: ${req.params.companyName}`),
        eq(tasks.company_id, req.user!.company_id)
      )
    });

    logger.info('Task lookup result', {
      found: !!task,
      taskId: task?.id,
      taskType: task?.task_type,
      taskStatus: task?.status
    });

    if (!task) {
      return res.status(404).json({
        message: `Could not find CARD task for company: ${req.params.companyName}`
      });
    }

    res.json(task);
  } catch (error) {
    logger.error('Error fetching CARD task', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      message: "Failed to fetch CARD task",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get CARD fields
router.get('/api/card/fields', requireAuth, async (req, res) => {
  try {
    logger.info('Fetching CARD fields');
    const fields = await db.select().from(cardFields);
    res.json(fields);
  } catch (error) {
    logger.error('Error fetching CARD fields', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      message: "Failed to fetch CARD fields",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get CARD responses for a task
router.get('/api/card/responses/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const responses = await db.select()
      .from(cardResponses)
      .where(eq(cardResponses.task_id, parseInt(taskId)));
    res.json(responses);
  } catch (error) {
    logger.error('Error fetching responses', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      message: "Failed to fetch responses",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Submit CARD form
router.post('/api/card/submit/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    logger.info('Starting form submission process', {
      taskId,
      userId: req.user!.id
    });

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, parseInt(taskId))
    });

    if (!task) {
      logger.error('Task not found', { taskId });
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!task.company_id) {
      logger.error('Task has no company', { taskId });
      return res.status(400).json({
        success: false,
        message: 'Task has no associated company'
      });
    }

    // Get all fields and responses
    const fields = await db.select().from(cardFields);
    const existingResponses = await db.select()
      .from(cardResponses)
      .where(eq(cardResponses.task_id, parseInt(taskId)));

    logger.info('Processing form submission', {
      taskId,
      companyId: task.company_id,
      totalFields: fields.length,
      existingResponses: existingResponses.length
    });

    const timestamp = new Date();

    try {
      // Process empty responses
      await processEmptyResponses(taskId, fields, existingResponses, timestamp);

      // Calculate and update company risk score
      logger.info('Calculating risk score', {
        taskId,
        companyId: task.company_id
      });

      const newRiskScore = await updateCompanyRiskScore(task.company_id, parseInt(taskId));

      // Update company onboarding status and available tabs
      logger.info('Updating company status', {
        companyId: task.company_id
      });

      const updatedCompany = await updateCompanyAfterCardCompletion(task.company_id);

      // Generate assessment JSON file
      logger.info('Generating assessment file', { taskId });

      const allResponses = await db.select()
        .from(cardResponses)
        .where(eq(cardResponses.task_id, parseInt(taskId)));

      const assessmentData = {
        taskId: parseInt(taskId),
        companyName: task.title.replace('Company CARD: ', ''),
        completionDate: timestamp.toISOString(),
        responses: await Promise.all(allResponses.map(async (response) => {
          const field = fields.find(f => f.id === response.field_id);
          return {
            fieldKey: field?.field_key,
            question: field?.question,
            response: response.response_value,
            status: response.status,
            riskScore: response.partial_risk_score,
            reasoning: response.ai_reasoning
          };
        })),
        totalRiskScore: newRiskScore
      };

      // Validate and prepare JSON content
      let fileContent: string;
      try {
        fileContent = JSON.stringify(assessmentData, null, 2);
        // Verify it can be parsed back
        JSON.parse(fileContent);
      } catch (error) {
        logger.error('JSON validation failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error('Failed to create valid JSON content');
      }

      const fileName = `card_assessment_${task.title.replace('Company CARD: ', '').toLowerCase()}_${timestamp.toISOString().replace(/[:.]/g, '')}.json`;

      logger.info('Creating assessment file', {
        fileName,
        contentLength: fileContent.length
      });

      // Create file using FileCreationService
      const fileResult = await FileCreationService.createFile({
        name: fileName,
        content: fileContent,
        type: 'application/json',
        userId: req.user!.id,
        companyId: task.company_id,
        metadata: {
          taskId: parseInt(taskId),
          formVersion: '1.0',
          submissionDate: timestamp.toISOString()
        },
        status: 'uploaded'
      });

      if (!fileResult.success) {
        logger.error('File creation failed', {
          error: fileResult.error,
          taskId,
          fileName
        });
        throw new Error(fileResult.error || 'Failed to create assessment file');
      }

      logger.info('Assessment file created', {
        fileId: fileResult.fileId,
        fileName
      });

      // Update task status to submitted
      const [updatedTask] = await db.update(tasks)
        .set({
          status: TaskStatus.SUBMITTED,
          progress: 100,
          completion_date: timestamp,
          updated_at: timestamp,
          metadata: {
            ...task.metadata,
            cardFormFile: fileResult.fileId,
            submissionDate: timestamp.toISOString()
          }
        })
        .where(eq(tasks.id, parseInt(taskId)))
        .returning();

      logger.info('Task update completed', {
        taskId: updatedTask.id,
        status: updatedTask.status,
        progress: updatedTask.progress,
        fileName,
        timestamp: timestamp.toISOString()
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/json');

      // Send success response
      const response = {
        success: true,
        message: "Form submitted successfully",
        totalFields: fields.length,
        completedFields: existingResponses.length,
        riskScore: newRiskScore,
        assessmentFile: fileName,
        company: {
          id: updatedCompany.id,
          availableTabs: updatedCompany.available_tabs
        }
      };

      logger.info('Sending success response', {
        taskId,
        success: true,
        responseBody: response
      });

      return res.json(response);

    } catch (error) {
      logger.error('Error in submission process', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        taskId,
        companyId: task.company_id
      });

      // Set error response headers
      res.setHeader('Content-Type', 'application/json');

      return res.status(500).json({
        success: false,
        message: "Failed to submit form",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

  } catch (error) {
    logger.error('Fatal error in submission handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Set error response headers
    res.setHeader('Content-Type', 'application/json');

    return res.status(500).json({
      success: false,
      message: "Failed to submit form",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Helper function to process empty responses
async function processEmptyResponses(
  taskId: string,
  fields: typeof cardFields.$inferSelect[],
  existingResponses: typeof cardResponses.$inferSelect[],
  timestamp: Date
) {
  // First, update all existing EMPTY responses
  const emptyResponses = existingResponses.filter(r => r.status === 'EMPTY');
  for (const response of emptyResponses) {
    const field = fields.find(f => f.id === response.field_id);
    if (!field) continue;

    await db.update(cardResponses)
      .set({
        response_value: "Unanswered.",
        status: 'COMPLETE',
        ai_suspicion_level: 100,
        partial_risk_score: field.partial_risk_score_max,
        ai_reasoning: "System Reasoning: User did not answer; Maximum Partial Risk Score applied to this form field response.",
        version: response.version + 1,
        updated_at: timestamp
      })
      .where(eq(cardResponses.id, response.id));
  }

  // Create responses for fields that don't have any response
  const existingFieldIds = new Set(existingResponses.map(r => r.field_id));
  const missingFields = fields.filter(f => !existingFieldIds.has(f.id));

  for (const field of missingFields) {
    await db.insert(cardResponses)
      .values({
        task_id: parseInt(taskId),
        field_id: field.id,
        response_value: "Unanswered.",
        status: 'COMPLETE',
        ai_suspicion_level: 100,
        partial_risk_score: field.partial_risk_score_max,
        ai_reasoning: "System Reasoning: User did not answer; Maximum Partial Risk Score applied to this form field response.",
        version: 1,
        created_at: timestamp,
        updated_at: timestamp
      });
  }
}

// Download assessment file
router.get('/api/card/download/:fileName', requireAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    logger.info('Downloading assessment file', {
      fileName,
      userId: req.user?.id
    });

    const file = await db.query.files.findFirst({
      where: eq(files.name, fileName)
    });

    if (!file) {
      logger.error('Assessment file not found', { fileName });
      return res.status(404).json({ message: 'Assessment file not found' });
    }

    // Set correct content type for JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Parse and re-stringify to ensure valid JSON
    try {
      const jsonContent = JSON.parse(file.path);
      res.json(jsonContent);
    } catch (error) {
      logger.error('Error parsing file content as JSON', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName
      });
      throw new Error('Invalid JSON content in file');
    }

  } catch (error) {
    logger.error('Error handling file download', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName: req.params.fileName
    });
    res.status(500).json({
      message: "Failed to download assessment file",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});


// Add new routes for saving and analyzing individual responses
router.post('/api/card/response/:taskId/:fieldId', requireAuth, async (req, res) => {
  try {
    const { taskId, fieldId } = req.params;
    const { response } = req.body;

    logger.info('Saving card response', {
      taskId,
      fieldId,
      hasResponse: !!response
    });

    const [updatedResponse] = await db.insert(cardResponses)
      .values({
        task_id: parseInt(taskId),
        field_id: parseInt(fieldId),
        response_value: response,
        status: response ? 'COMPLETE' : 'EMPTY',
        version: 1,
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflictDoUpdate({
        target: [cardResponses.task_id, cardResponses.field_id],
        set: {
          response_value: response,
          status: response ? 'COMPLETE' : 'EMPTY',
          version: sql`${cardResponses.version} + 1`,
          updated_at: new Date()
        }
      })
      .returning();

    // Calculate progress
    const totalFields = await db.select({ count: sql<number>`count(*)` })
      .from(cardFields)
      .then(result => result[0].count);

    const completedFields = await db.select({ count: sql<number>`count(*)` })
      .from(cardResponses)
      .where(and(
        eq(cardResponses.task_id, parseInt(taskId)),
        eq(cardResponses.status, 'COMPLETE')
      ))
      .then(result => result[0].count);

    const progress = Math.round((completedFields / totalFields) * 100);

    // Update task progress
    await db.update(tasks)
      .set({ 
        progress,
        updated_at: new Date()
      })
      .where(eq(tasks.id, parseInt(taskId)));

    logger.info('Response saved successfully', {
      taskId,
      fieldId,
      responseId: updatedResponse.id,
      progress
    });

    res.json({
      id: updatedResponse.id,
      status: updatedResponse.status,
      progress
    });

  } catch (error) {
    logger.error('Error saving response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: req.params.taskId,
      fieldId: req.params.fieldId
    });
    res.status(500).json({
      message: "Failed to save response",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post('/api/card/analyze/:taskId/:fieldId', requireAuth, async (req, res) => {
  try {
    const { taskId, fieldId } = req.params;
    const { response } = req.body;

    logger.info('Starting response analysis', {
      taskId,
      fieldId,
      hasResponse: !!response
    });

    // Get the field details for AI instructions
    const field = await db.query.cardFields.findFirst({
      where: eq(cardFields.id, parseInt(fieldId))
    });

    if (!field) {
      throw new Error('Field not found');
    }

    // Analyze the response using OpenAI
    const analysis = await analyzeCardResponse(
      response, 
      field.question,
      field.partial_risk_score_max || 100,
      field.example_response
    );

    // Update the response with AI analysis
    const [updatedResponse] = await db.update(cardResponses)
      .set({
        ai_suspicion_level: analysis.suspicionLevel,
        partial_risk_score: analysis.riskScore,
        ai_reasoning: analysis.reasoning,
        updated_at: new Date()
      })
      .where(and(
        eq(cardResponses.task_id, parseInt(taskId)),
        eq(cardResponses.field_id, parseInt(fieldId))
      ))
      .returning();

    logger.info('Analysis completed successfully', {
      taskId,
      fieldId,
      responseId: updatedResponse.id,
      suspicionLevel: analysis.suspicionLevel,
      riskScore: analysis.riskScore
    });

    res.json({
      field_id: parseInt(fieldId),
      ai_suspicion_level: analysis.suspicionLevel,
      partial_risk_score: analysis.riskScore,
      reasoning: analysis.reasoning
    });

  } catch (error) {
    logger.error('Error analyzing response', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: req.params.taskId,
      fieldId: req.params.fieldId
    });
    res.status(500).json({
      message: "Failed to analyze response",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;