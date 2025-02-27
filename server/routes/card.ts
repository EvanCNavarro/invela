import { Router } from 'express';
import { db } from '@db';
import { tasks, cardFields, cardResponses } from '@db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { analyzeCardResponse } from '../services/openai';

const router = Router();

// Get CARD fields
router.get('/api/card/fields', requireAuth, async (req, res) => {
  try {
    console.log('[Card Routes] Fetching CARD fields');

    const fields = await db.select().from(cardFields);

    console.log('[Card Routes] Fields retrieved:', {
      count: fields.length,
      sections: fields.length > 0 ? [...new Set(fields.map(f => f.wizard_section))] : [],
      fieldTypes: fields.length > 0 ? [...new Set(fields.map(f => f.field_key))] : [],
      timestamp: new Date().toISOString()
    });

    res.json(fields);
  } catch (error) {
    console.error('[Card Routes] Error fetching CARD fields:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
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

    console.log('[Card Routes] Fetching responses for task:', {
      taskId,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const responses = await db.select()
      .from(cardResponses)
      .where(eq(cardResponses.task_id, parseInt(taskId)));

    console.log('[Card Routes] Responses retrieved:', {
      count: responses.length,
      responseStatuses: responses.map(r => r.status),
      timestamp: new Date().toISOString()
    });

    res.json(responses);
  } catch (error) {
    console.error('[Card Routes] Error fetching responses:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: "Failed to fetch responses",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Save individual CARD field response and update progress
router.post('/api/card/response/:taskId/:fieldId', requireAuth, async (req, res) => {
  try {
    const { taskId, fieldId } = req.params;
    const { response } = req.body;

    console.log('[Card Routes] Saving field response:', {
      taskId,
      fieldId,
      hasResponse: !!response,
      timestamp: new Date().toISOString()
    });

    const status = response ? 'COMPLETE' : 'EMPTY';
    const timestamp = new Date();

    // Check if response already exists
    const [existingResponse] = await db.select()
      .from(cardResponses)
      .where(
        and(
          eq(cardResponses.task_id, parseInt(taskId)),
          eq(cardResponses.field_id, parseInt(fieldId))
        )
      );

    let savedResponse;
    if (existingResponse) {
      console.log('[Card Routes] Updating existing response:', {
        responseId: existingResponse.id,
        oldStatus: existingResponse.status,
        newStatus: status,
        version: existingResponse.version + 1,
        timestamp: timestamp.toISOString()
      });

      [savedResponse] = await db.update(cardResponses)
        .set({
          response_value: response,
          status,
          version: existingResponse.version + 1,
          updated_at: timestamp
        })
        .where(eq(cardResponses.id, existingResponse.id))
        .returning();
    } else {
      console.log('[Card Routes] Creating new response:', {
        taskId,
        fieldId,
        status,
        timestamp: timestamp.toISOString()
      });

      [savedResponse] = await db.insert(cardResponses)
        .values({
          task_id: parseInt(taskId),
          field_id: parseInt(fieldId),
          response_value: response,
          status,
          version: 1,
          created_at: timestamp,
          updated_at: timestamp
        })
        .returning();
    }

    // Get total number of fields
    const totalFields = await db.select()
      .from(cardFields)
      .execute()
      .then(fields => fields.length);

    // Get number of completed responses
    const completedResponses = await db.select()
      .from(cardResponses)
      .where(
        and(
          eq(cardResponses.task_id, parseInt(taskId)),
          eq(cardResponses.status, 'COMPLETE')
        )
      )
      .execute()
      .then(responses => responses.length);

    // Calculate progress percentage
    const progress = Math.floor((completedResponses / totalFields) * 100);

    console.log('[Card Routes] Updating task progress:', {
      taskId,
      totalFields,
      completedResponses,
      calculatedProgress: progress,
      timestamp: timestamp.toISOString()
    });

    // Update task progress
    await db.update(tasks)
      .set({ progress })
      .where(eq(tasks.id, parseInt(taskId)));

    // Return response with updated progress
    res.json({
      ...savedResponse,
      progress
    });

  } catch (error) {
    console.error('[Card Routes] Error saving response:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: "Failed to save response",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get CARD task by company name
router.get('/api/tasks/card/:companyName', requireAuth, async (req, res) => {
  try {
    console.log('[Card Routes] Fetching CARD task:', {
      companyName: req.params.companyName,
      userId: req.user?.id,
      companyId: req.user?.company_id,
      timestamp: new Date().toISOString()
    });

    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.task_type, 'company_card'),
        ilike(tasks.title, `Company CARD: ${req.params.companyName}`),
        eq(tasks.company_id, req.user!.company_id)
      )
    });

    console.log('[Card Routes] Task lookup result:', {
      found: !!task,
      taskId: task?.id,
      taskType: task?.task_type,
      taskStatus: task?.status,
      timestamp: new Date().toISOString()
    });

    if (!task) {
      return res.status(404).json({
        message: `Could not find CARD task for company: ${req.params.companyName}`
      });
    }

    res.json(task);
  } catch (error) {
    console.error('[Card Routes] Error fetching CARD task:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: "Failed to fetch CARD task",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Analyze card response
router.post('/api/card/analyze/:taskId/:fieldId', requireAuth, async (req, res) => {
  try {
    const { taskId, fieldId } = req.params;
    const { response } = req.body;

    console.log('[Card Routes] Analyzing response:', {
      taskId,
      fieldId,
      responseLength: response?.length,
      timestamp: new Date().toISOString()
    });

    // Get the field details to pass to analysis
    const [field] = await db.select()
      .from(cardFields)
      .where(eq(cardFields.id, parseInt(fieldId)));

    if (!field) {
      return res.status(404).json({ message: "Field not found" });
    }

    // Analyze the response
    const analysis = await analyzeCardResponse(
      response,
      field.question,
      field.partial_risk_score_max,
      field.example_response
    );

    // Update the response record with analysis results
    const [updatedResponse] = await db.update(cardResponses)
      .set({
        ai_suspicion_level: analysis.suspicionLevel,
        partial_risk_score: analysis.riskScore,
        updated_at: new Date()
      })
      .where(
        and(
          eq(cardResponses.task_id, parseInt(taskId)),
          eq(cardResponses.field_id, parseInt(fieldId))
        )
      )
      .returning();

    console.log('[Card Routes] Analysis complete:', {
      taskId,
      fieldId,
      suspicionLevel: analysis.suspicionLevel,
      riskScore: analysis.riskScore,
      timestamp: new Date().toISOString()
    });

    res.json({
      ...updatedResponse,
      reasoning: analysis.reasoning
    });
  } catch (error) {
    console.error('[Card Routes] Error analyzing response:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: "Failed to analyze response",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;