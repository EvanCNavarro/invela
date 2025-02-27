import { Router } from 'express';
import { db } from '@db';
import { tasks, cardFields, cardResponses } from '@db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { analyzeCardResponse } from '../services/openai';
import { updateCompanyRiskScore } from '../services/riskScore';
import { updateCompanyAfterCardCompletion } from '../services/company';
import { generateAssessmentFile } from '../services/fileGeneration';
import { TaskStatus } from '@db/schema';
import path from 'path';
import fs from 'fs';

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
        eq(cardResponses.task_id, parseInt(taskId)),
        eq(cardResponses.field_id, parseInt(fieldId))
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
        eq(cardResponses.task_id, parseInt(taskId)),
        eq(cardResponses.status, 'COMPLETE')
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
        eq(cardResponses.task_id, parseInt(taskId)),
        eq(cardResponses.field_id, parseInt(fieldId))
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
    console.log('[Card Routes] Starting form submission process:', {
      taskId,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, parseInt(taskId))
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.company_id) {
      throw new Error('Task has no associated company');
    }

    // Get all fields
    const fields = await db.select().from(cardFields);
    console.log('[Card Routes] Processing form submission:', {
      taskId,
      companyId: task.company_id,
      totalFields: fields.length,
      timestamp: new Date().toISOString()
    });

    // Get existing responses
    const existingResponses = await db.select()
      .from(cardResponses)
      .where(eq(cardResponses.task_id, parseInt(taskId)));

    const timestamp = new Date();

    // First, update all existing EMPTY responses
    const emptyResponses = existingResponses.filter(r => r.status === 'EMPTY');
    console.log('[Card Routes] Processing empty responses:', {
      count: emptyResponses.length,
      timestamp: timestamp.toISOString()
    });

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

    console.log('[Card Routes] Processing missing fields:', {
      count: missingFields.length,
      timestamp: timestamp.toISOString()
    });

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

    try {
      // Calculate and update company risk score
      console.log('[Card Routes] Calculating risk score:', {
        taskId,
        companyId: task.company_id,
        timestamp: timestamp.toISOString()
      });

      const newRiskScore = await updateCompanyRiskScore(task.company_id, parseInt(taskId));

      // Update company onboarding status and available tabs
      console.log('[Card Routes] Updating company status:', {
        companyId: task.company_id,
        timestamp: new Date().toISOString()
      });

      const updatedCompany = await updateCompanyAfterCardCompletion(task.company_id);

      // Generate assessment file
      const { fileName } = await generateAssessmentFile(
        parseInt(taskId),
        task.title.replace('Company CARD: ', '')
      );

      // Update task status to submitted
      await db.update(tasks)
        .set({ 
          status: TaskStatus.SUBMITTED,
          completion_date: new Date(),
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            assessment_file: fileName,
            submission_date: new Date().toISOString()
          }
        })
        .where(eq(tasks.id, parseInt(taskId)));

      res.json({ 
        success: true,
        message: "Form submitted successfully",
        totalFields: fields.length,
        completedFields: existingResponses.length - emptyResponses.length,
        autoFilledFields: emptyResponses.length + missingFields.length,
        riskScore: newRiskScore,
        assessmentFile: fileName,
        company: {
          id: updatedCompany.id,
          onboardingCompleted: updatedCompany.onboarding_company_completed,
          availableTabs: updatedCompany.available_tabs
        }
      });

    } catch (error) {
      console.error('[Card Routes] Error in final submission steps:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        taskId,
        companyId: task.company_id,
        timestamp: new Date().toISOString()
      });
      throw error;
    }

  } catch (error) {
    console.error('[Card Routes] Error in form submission:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to submit form",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Download assessment file
router.get('/api/card/download/:fileName', requireAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    console.log('[Card Routes] Downloading assessment file:', {
      fileName,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const filePath = path.join(process.cwd(), 'uploads', 'card-assessments', fileName);

    if (!fs.existsSync(filePath)) {
      console.error('[Card Routes] Assessment file not found:', {
        fileName,
        filePath,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ message: 'Assessment file not found' });
    }

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('[Card Routes] Error downloading file:', {
          error: err,
          fileName,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('[Card Routes] File downloaded successfully:', {
          fileName,
          timestamp: new Date().toISOString()
        });
      }
    });
  } catch (error) {
    console.error('[Card Routes] Error handling file download:', {
      error,
      fileName: req.params.fileName,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: "Failed to download assessment file",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;