import { Router } from 'express';
import { db } from '@db';
import { tasks, cardFields, cardResponses } from '@db/schema';
import { eq, and, ilike, not } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { analyzeCardResponse } from '../services/openai';
import { TaskStatus } from '@db/schema';

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
    const trimmedResponse = response ? response.trim() : '';

    console.log('[Card Routes] Saving field response:', {
      taskId,
      fieldId,
      hasResponse: !!trimmedResponse,
      timestamp: new Date().toISOString()
    });

    // Set appropriate status based on response content
    const status = trimmedResponse ? 'COMPLETE' : 'EMPTY';
    const timestamp = new Date();

    // Check if response already exists with exact match on task_id and field_id
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
          response_value: trimmedResponse,
          status,
          version: existingResponse.version + 1,
          updated_at: timestamp,
          // Reset analysis fields when emptied
          ...(status === 'EMPTY' ? {
            ai_suspicion_level: 0,
            partial_risk_score: 0,
            ai_reasoning: null
          } : {})
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
          response_value: trimmedResponse,
          status,
          version: 1,
          created_at: timestamp,
          updated_at: timestamp
        })
        .returning();
    }

    // Calculate progress based on completed responses count
    const completedCount = await db.select()
      .from(cardResponses)
      .where(
        and(
          eq(cardResponses.task_id, parseInt(taskId)),
          eq(cardResponses.status, 'COMPLETE')
        )
      )
      .execute()
      .then(responses => responses.length);

    // Progress is simply the count as a percentage
    const progress = completedCount;

    console.log('[Card Routes] Progress calculation:', {
      completedCount,
      progress,
      timestamp: new Date().toISOString()
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

    console.log('[Card Routes] Starting OpenAI analysis:', {
      taskId,
      fieldId,
      responseLength: response?.length,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // Get the field details to pass to analysis
    const [field] = await db.select()
      .from(cardFields)
      .where(eq(cardFields.id, parseInt(fieldId)));

    if (!field) {
      console.log('[Card Routes] Field not found:', {
        fieldId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ message: "Field not found" });
    }

    console.log('[Card Routes] Found field for analysis:', {
      fieldId: field.id,
      fieldKey: field.field_key,
      maxRiskScore: field.partial_risk_score_max,
      hasExample: !!field.example_response,
      timestamp: new Date().toISOString()
    });

    // Analyze the response
    const analysis = await analyzeCardResponse(
      response,
      field.question,
      field.partial_risk_score_max,
      field.example_response
    );

    console.log('[Card Routes] OpenAI analysis received:', {
      taskId,
      fieldId,
      suspicionLevel: analysis.suspicionLevel,
      riskScore: analysis.riskScore,
      hasReasoning: !!analysis.reasoning,
      timestamp: new Date().toISOString()
    });

    console.log('[Card Routes] Updating database with analysis results:', {
      taskId,
      fieldId,
      timestamp: new Date().toISOString()
    });

    // Update the response record with analysis results
    const [updatedResponse] = await db.update(cardResponses)
      .set({
        ai_suspicion_level: analysis.suspicionLevel,
        partial_risk_score: analysis.riskScore,
        ai_reasoning: analysis.reasoning, // Store the reasoning
        updated_at: new Date()
      })
      .where(
        and(
          eq(cardResponses.task_id, parseInt(taskId)),
          eq(cardResponses.field_id, parseInt(fieldId))
        )
      )
      .returning();

    console.log('[Card Routes] Database updated successfully:', {
      responseId: updatedResponse.id,
      newSuspicionLevel: updatedResponse.ai_suspicion_level,
      newRiskScore: updatedResponse.partial_risk_score,
      hasReasoning: !!updatedResponse.ai_reasoning,
      timestamp: new Date().toISOString()
    });

    res.json({
      ...updatedResponse,
      reasoning: analysis.reasoning
    });
  } catch (error) {
    console.error('[Card Routes] Error in analysis chain:', {
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

// Add new endpoint for form submission
router.post('/api/card/submit/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('[Card Routes] Processing form submission:', {
      taskId,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // Get all fields
    const fields = await db.select().from(cardFields);

    // Get existing responses
    const existingResponses = await db.select()
      .from(cardResponses)
      .where(eq(cardResponses.task_id, parseInt(taskId)));

    const timestamp = new Date();

    // First, update all existing EMPTY responses
    const emptyResponses = existingResponses.filter(r => r.status === 'EMPTY');
    for (const response of emptyResponses) {
      console.log('[Card Routes] Updating empty response:', {
        fieldId: response.field_id,
        taskId,
        timestamp: timestamp.toISOString()
      });

      // Get the field to access partial_risk_score_max
      const [field] = fields.filter(f => f.id === response.field_id);

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

    // Then create responses for fields that don't have any response
    const existingFieldIds = new Set(existingResponses.map(r => r.field_id));
    const missingFields = fields.filter(f => !existingFieldIds.has(f.id));

    for (const field of missingFields) {
      console.log('[Card Routes] Creating unanswered response:', {
        fieldId: field.id,
        taskId,
        timestamp: timestamp.toISOString()
      });

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

    // Update task status to submitted
    await db.update(tasks)
      .set({ 
        status: TaskStatus.SUBMITTED,
        completion_date: timestamp,
        updated_at: timestamp
      })
      .where(eq(tasks.id, parseInt(taskId)));

    console.log('[Card Routes] Form submission completed:', {
      taskId,
      totalFields: fields.length,
      existingResponses: existingResponses.length,
      updatedEmptyResponses: emptyResponses.length,
      newResponses: missingFields.length,
      timestamp: timestamp.toISOString()
    });

    res.json({ 
      success: true,
      message: "Form submitted successfully",
      totalFields: fields.length,
      completedFields: existingResponses.length - emptyResponses.length,
      autoFilledFields: emptyResponses.length + missingFields.length
    });

  } catch (error) {
    console.error('[Card Routes] Error in form submission:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: "Failed to submit form",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;