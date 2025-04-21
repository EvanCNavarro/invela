/**
 * Open Banking Survey API Routes
 * 
 * These routes handle the Open Banking Survey form functionality including:
 * - Fetching form fields
 * - Saving form responses
 * - Analyzing responses with OpenAI
 * - Submitting the completed form
 * - Generating CSV files for submissions
 */

import type { Express, Request, Response } from 'express';
import { db } from '@db';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { handleFileCreation } from '../services/fileCreation';
import {
  companies,
  DocumentCategory,
  files,
  KYBFieldStatus,
  openBankingFields,
  openBankingResponses,
  TaskStatus,
  tasks
} from '@db/schema';
import { logger } from '../utils/logger';
import { openaiAnalyzeContent } from '../services/openai';
import { WebSocketServer, WebSocket } from 'ws';
import { broadcastWebSocketEvent } from '../services/websocket';
import path from 'path';
import fs from 'fs';
import * as csv from 'csv-stringify';

export function registerOpenBankingRoutes(app: Express, wss: WebSocketServer) {
  logger.info('[OpenBankingRoutes] Setting up routes...');

  // Get all Open Banking fields
  app.get('/api/open-banking/fields', async (req, res) => {
    try {
      logger.info('[OpenBankingRoutes] Fetching all fields');
      const fields = await db.select().from(openBankingFields).orderBy(openBankingFields.order);
      res.json(fields);
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error fetching fields', { error });
      res.status(500).json({ error: 'Failed to fetch Open Banking fields' });
    }
  });

  // Get responses for a specific task
  app.get('/api/open-banking/responses/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    try {
      logger.info('[OpenBankingRoutes] Fetching responses for task', { taskId });
      
      const responses = await db.select().from(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId))
        .orderBy(openBankingResponses.id);
      
      res.json(responses);
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error fetching responses', { error, taskId });
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  });

  // Save a single field response
  app.post('/api/open-banking/response/:taskId/:fieldId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const fieldId = parseInt(req.params.fieldId);
    const { response } = req.body;
    
    if (response === undefined) {
      return res.status(400).json({ error: 'Response is required' });
    }
    
    try {
      logger.info('[OpenBankingRoutes] Saving field response', { taskId, fieldId });
      
      // Check if a response already exists for this task and field
      const existingResponse = await db.select().from(openBankingResponses)
        .where(and(
          eq(openBankingResponses.task_id, taskId),
          eq(openBankingResponses.field_id, fieldId)
        ))
        .limit(1);
      
      let result;
      const responseValue = response.trim();
      const status = responseValue ? KYBFieldStatus.COMPLETE : KYBFieldStatus.EMPTY;
      
      if (existingResponse.length > 0) {
        // Update existing response
        result = await db.update(openBankingResponses)
          .set({
            response_value: responseValue,
            status,
            version: existingResponse[0].version + 1,
            updated_at: new Date()
          })
          .where(eq(openBankingResponses.id, existingResponse[0].id))
          .returning();
      } else {
        // Create new response
        result = await db.insert(openBankingResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            response_value: responseValue,
            status,
            version: 1
          })
          .returning();
      }
      
      // Calculate task progress
      const allFields = await db.select().from(openBankingFields);
      const totalFields = allFields.length;
      
      const completedResponses = await db.select().from(openBankingResponses)
        .where(and(
          eq(openBankingResponses.task_id, taskId),
          eq(openBankingResponses.status, KYBFieldStatus.COMPLETE)
        ));
      
      const completedCount = completedResponses.length;
      const progress = totalFields > 0 ? Math.round((completedCount / totalFields) * 100) / 100 : 0;
      
      // Update task progress
      await db.update(tasks)
        .set({ 
          progress, 
          updated_at: new Date(),
          status: progress >= 1 ? TaskStatus.READY_FOR_SUBMISSION : TaskStatus.IN_PROGRESS
        })
        .where(eq(tasks.id, taskId));
      
      const responseData = {
        ...result[0],
        progress
      };
      
      res.json(responseData);
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error saving response', { error, taskId, fieldId });
      res.status(500).json({ error: 'Failed to save response' });
    }
  });

  // Analyze a response using OpenAI
  app.post('/api/open-banking/analyze/:taskId/:fieldId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const fieldId = parseInt(req.params.fieldId);
    const { response } = req.body;
    
    if (!response || response.trim() === '') {
      return res.status(400).json({ error: 'Response is required' });
    }
    
    try {
      logger.info('[OpenBankingRoutes] Analyzing response with OpenAI', { taskId, fieldId });
      
      // Get field information to provide context
      const field = await db.select().from(openBankingFields)
        .where(eq(openBankingFields.id, fieldId))
        .limit(1);
      
      if (field.length === 0) {
        return res.status(404).json({ error: 'Field not found' });
      }
      
      // Get the task for company context
      const task = await db.select({
        id: tasks.id,
        company_id: tasks.company_id
      }).from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      
      if (task.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Get company for additional context
      const company = await db.select().from(companies)
        .where(eq(companies.id, task[0].company_id))
        .limit(1);
      
      // Prepare the context for OpenAI analysis
      const context = {
        field_question: field[0].question,
        field_key: field[0].field_key,
        field_group: field[0].group,
        field_help_text: field[0].help_text || "",
        answer_expectation: field[0].answer_expectation || "",
        company_name: company.length > 0 ? company[0].name : "",
        company_description: company.length > 0 ? company[0].description || "" : ""
      };
      
      // Call OpenAI service
      const analysisResult = await openaiAnalyzeContent(response, context);
      
      // Update the response in the database with the analysis results
      const existingResponse = await db.select().from(openBankingResponses)
        .where(and(
          eq(openBankingResponses.task_id, taskId),
          eq(openBankingResponses.field_id, fieldId)
        ))
        .limit(1);
      
      if (existingResponse.length > 0) {
        await db.update(openBankingResponses)
          .set({
            ai_suspicion_level: analysisResult.suspicionLevel,
            partial_risk_score: analysisResult.riskScore,
            reasoning: analysisResult.reasoning,
            updated_at: new Date()
          })
          .where(eq(openBankingResponses.id, existingResponse[0].id));
      }
      
      // Return the analysis results
      const responseWithAnalysis = {
        field_id: fieldId,
        ai_suspicion_level: analysisResult.suspicionLevel,
        partial_risk_score: analysisResult.riskScore,
        reasoning: analysisResult.reasoning
      };
      
      res.json(responseWithAnalysis);
      
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error analyzing response with OpenAI', { error, taskId, fieldId });
      res.status(500).json({ error: 'Failed to analyze response' });
    }
  });

  // Submit the Open Banking Survey
  app.post('/api/open-banking/submit/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    try {
      logger.info('[OpenBankingRoutes] Processing form submission', { taskId });
      
      // Get the task data
      const taskData = await db.select().from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      
      if (taskData.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const task = taskData[0];
      const companyId = task.company_id;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Task is not associated with a company' });
      }
      
      // Get all responses for this task
      const responses = await db.select({
        id: openBankingResponses.id,
        fieldId: openBankingResponses.field_id,
        responseValue: openBankingResponses.response_value,
        aiSuspicionLevel: openBankingResponses.ai_suspicion_level,
        partialRiskScore: openBankingResponses.partial_risk_score
      }).from(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId));
      
      // Get all fields to check completion
      const fields = await db.select().from(openBankingFields);
      
      // Check if all required fields have responses
      const requiredFields = fields.filter(field => field.required);
      const requiredFieldIds = requiredFields.map(field => field.id);
      const respondedFieldIds = responses.map(resp => resp.fieldId);
      
      const missingRequiredFields = requiredFieldIds.filter(
        id => !respondedFieldIds.includes(id) || 
              !responses.find(r => r.fieldId === id)?.responseValue
      );
      
      if (missingRequiredFields.length > 0) {
        const missingFieldsInfo = await db.select({
          id: openBankingFields.id,
          fieldKey: openBankingFields.field_key,
          displayName: openBankingFields.display_name
        }).from(openBankingFields)
          .where(inArray(openBankingFields.id, missingRequiredFields));
        
        return res.status(400).json({ 
          error: 'Required fields are missing responses',
          missingFields: missingFieldsInfo
        });
      }
      
      // Calculate risk score from all responses
      const maxPossibleRiskScore = 1000; // Arbitrary max score
      let totalRiskScore = 0;
      
      responses.forEach(response => {
        if (response.partialRiskScore) {
          totalRiskScore += response.partialRiskScore;
        }
      });
      
      // Normalize to 0-100 scale
      const riskScore = Math.min(100, Math.round((totalRiskScore / maxPossibleRiskScore) * 100));
      
      logger.info('[OpenBankingRoutes] Calculated risk score', { taskId, riskScore });
      
      // Generate CSV file
      const csvFileName = `open_banking_survey_${task.company_id}_${new Date().toISOString().slice(0, 10)}.csv`;
      const csvFilePath = path.join(__dirname, '../../temp', csvFileName);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Map the fields and responses for CSV output
      const fieldMap = new Map(fields.map(f => [f.id, f]));
      const csvData = responses.map(response => {
        const field = fieldMap.get(response.fieldId);
        return {
          'Field': field?.display_name || '',
          'Group': field?.group || '',
          'Question': field?.question || '',
          'Response': response.responseValue || '',
          'Suspicion Level': response.aiSuspicionLevel || 0,
          'Risk Score': response.partialRiskScore || 0
        };
      });
      
      // Generate CSV file
      const writeStream = fs.createWriteStream(csvFilePath);
      const stringifier = csv.stringify({ header: true });
      
      stringifier.pipe(writeStream);
      csvData.forEach(row => stringifier.write(row));
      stringifier.end();
      
      // Wait for the file to be written
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });
      
      logger.info('[OpenBankingRoutes] CSV file generated', { taskId, csvFilePath });
      
      // Create a file record in the database
      const userId = req.user?.id || null;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const fileStats = fs.statSync(csvFilePath);
      const fileBuffer = fs.readFileSync(csvFilePath);
      
      // Save file to database
      const fileRecord = await handleFileCreation({
        name: csvFileName,
        size: fileStats.size,
        type: 'text/csv',
        buffer: fileBuffer,
        userId,
        companyId,
        category: DocumentCategory.OTHER,
        metadata: {
          taskId,
          taskType: 'open_banking_survey',
          generated: true
        }
      });
      
      // Update task status
      await db.update(tasks)
        .set({
          status: TaskStatus.COMPLETED,
          progress: 1,
          completion_date: new Date(),
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // Update company with risk score and onboarding status
      const companyUpdate = await db.update(companies)
        .set({
          risk_score: riskScore,
          onboarding_company_completed: true,
          available_tabs: sql`array_append(available_tabs, 'dashboard')`,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning({
          id: companies.id,
          name: companies.name,
          available_tabs: companies.available_tabs
        });
      
      // After updating the company, broadcast a WebSocket event to notify clients
      if (companyUpdate.length > 0) {
        await broadcastWebSocketEvent(wss, {
          type: 'company_updated',
          payload: {
            company_id: companyId,
            company_name: companyUpdate[0].name,
            available_tabs: companyUpdate[0].available_tabs,
            cache_invalidation: true
          }
        });
      }
      
      // Unlock dependent tasks
      await unlockDependentTasks(taskId);
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(csvFilePath);
      } catch (error) {
        logger.warn('[OpenBankingRoutes] Failed to clean up temporary CSV file', { error, csvFilePath });
      }
      
      // Return success response with risk score and file information
      res.json({
        success: true,
        taskId,
        riskScore,
        assessmentFile: fileRecord.id
      });
      
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error submitting Open Banking Survey', { error, taskId });
      res.status(500).json({ error: 'Failed to submit Open Banking Survey' });
    }
  });

  logger.info('[OpenBankingRoutes] Routes setup completed');
}

// Helper function to unlock dependent tasks
async function unlockDependentTasks(taskId: number) {
  try {
    logger.info('[OpenBankingRoutes] Checking for dependent tasks to unlock', { taskId });
    
    // Get the current task
    const currentTask = await db.select({
      id: tasks.id,
      company_id: tasks.company_id,
      task_type: tasks.task_type
    }).from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (currentTask.length === 0) {
      logger.warn('[OpenBankingRoutes] Task not found for unlocking dependents', { taskId });
      return;
    }
    
    const task = currentTask[0];
    const companyId = task.company_id;
    
    if (!companyId) {
      logger.warn('[OpenBankingRoutes] Task has no company ID, cannot unlock dependents', { taskId });
      return;
    }
    
    // Check if this is an open banking survey task
    if (task.task_type !== 'open_banking_survey') {
      logger.info('[OpenBankingRoutes] Not an open banking survey task, no dependents to unlock', { taskId, taskType: task.task_type });
      return;
    }
    
    // Update all tasks that depend on this one
    // If you have specific dependent task types, you would list them here
    const dependentTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.company_id, companyId),
        eq(tasks.status, TaskStatus.PENDING),
        // Add specific task types here if needed
      ));
    
    logger.info('[OpenBankingRoutes] Found dependent tasks', { count: dependentTasks.length });
    
    // Unlock each dependent task
    for (const depTask of dependentTasks) {
      await db.update(tasks)
        .set({
          status: TaskStatus.NOT_STARTED,
          updated_at: new Date()
        })
        .where(eq(tasks.id, depTask.id));
      
      logger.info('[OpenBankingRoutes] Unlocked dependent task', { taskId: depTask.id });
    }
    
  } catch (error) {
    logger.error('[OpenBankingRoutes] Error unlocking dependent tasks', { error, taskId });
  }
}