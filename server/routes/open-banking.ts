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
import { Logger } from '../utils/logger';
import { WebSocketServer, WebSocket } from 'ws';
import { broadcastMessage } from '../services/websocket';
import path from 'path';
import fs from 'fs';
import { openai } from '../utils/openaiUtils';

// Create a logger instance
const logger = new Logger('OpenBankingRoutes');

// Function to analyze content with OpenAI
async function analyzeContent(response: string, context: any) {
  const startTime = Date.now();
  
  console.log('[OpenAI Service] Starting Open Banking response analysis:', {
    responseLength: response.length,
    context: Object.keys(context),
    startTime: new Date().toISOString()
  });
  
  const prompt = `
As a security and compliance expert, analyze this response to a banking compliance question.
Compare it to best practices and evaluate its level of risk.

Question: ${context.field_question}
Field Key: ${context.field_key}
Group: ${context.field_group}
Help Text: ${context.field_help_text}
Answer Expectation: ${context.answer_expectation}
Company Name: ${context.company_name}
Company Description: ${context.company_description}

User Response: ${response}

Analyze for:
1. Completeness of the answer
2. Alignment with industry best practices
3. Potential red flags or concerning omissions
4. Level of risk implied by the response

Respond with a JSON object containing:
{
  "suspicionLevel": number (0-100, higher means more concerning),
  "riskScore": number (0-100, higher means more risk),
  "reasoning": string (explanation of the analysis)
}
`;
  
  try {
    console.log('[OpenAI Service] Sending request to OpenAI:', {
      timestamp: new Date().toISOString()
    });
    
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are a banking compliance expert who analyzes responses to regulatory questions." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const duration = Date.now() - startTime;
    
    if (!openaiResponse.choices[0].message.content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const result = JSON.parse(openaiResponse.choices[0].message.content);
    
    console.log('[OpenAI Service] Analysis completed successfully:', {
      duration,
      suspicionLevel: result.suspicionLevel,
      riskScore: result.riskScore
    });
    
    return {
      suspicionLevel: result.suspicionLevel,
      riskScore: result.riskScore,
      reasoning: result.reasoning
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OpenAI Service] Error analyzing content:', errorMessage);
    
    // Return default values on error
    return {
      suspicionLevel: 50,
      riskScore: 50,
      reasoning: "Error analyzing content: " + errorMessage
    };
  }
}

export function registerOpenBankingRoutes(app: Express, wss: WebSocketServer) {
  logger.info('[OpenBankingRoutes] Setting up routes...');

  // Get all Open Banking fields
  app.get('/api/open-banking/fields', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized access to fields');
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required',
          details: {
            authenticated: false,
            hasUser: false,
            hasSession: !!req.session,
            timestamp: new Date().toISOString()
          }
        });
      }
      
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
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized access to responses', { taskId });
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required', 
          details: {
            authenticated: false,
            hasUser: false,
            hasSession: !!req.session,
            timestamp: new Date().toISOString()
          }
        });
      }
      
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
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized attempt to save response', { taskId, fieldId });
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required',
          details: {
            authenticated: false,
            hasUser: false,
            hasSession: !!req.session,
            timestamp: new Date().toISOString()
          }
        });
      }
      
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
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized analysis attempt', { taskId, fieldId });
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required',
          details: {
            authenticated: false,
            hasUser: false,
            hasSession: !!req.session,
            timestamp: new Date().toISOString()
          }
        });
      }
      
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
      
      // Call OpenAI service with the existing analyzeContent function
      const analysisResult = await analyzeContent(response, context);
      
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
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized submission attempt', { taskId });
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required',
          details: {
            authenticated: false,
            hasUser: false,
            hasSession: !!req.session,
            timestamp: new Date().toISOString()
          }
        });
      }
      
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
      
      // If no responses found, reject submission
      if (responses.length === 0) {
        return res.status(400).json({
          error: 'Cannot submit empty form. Please provide responses to the required fields.'
        });
      }
      
      // Get all fields to check completion
      const fields = await db.select().from(openBankingFields);
      if (fields.length === 0) {
        return res.status(500).json({
          error: 'Form field definitions not found. Please contact support.'
        });
      }
      
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
      
      // Generate CSV file using a simple approach (without csv-stringify)
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );
      
      // Combine headers and rows
      const csvContent = [headers, ...rows].join('\n');
      
      // Write to file
      fs.writeFileSync(csvFilePath, csvContent);
      
      logger.info('[OpenBankingRoutes] CSV file generated', { taskId, csvFilePath });
      
      // Create a file record in the database
      const userId = req.user?.id || null;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const fileStats = fs.statSync(csvFilePath);
      const fileBuffer = fs.readFileSync(csvFilePath);
      
      // Save file to database
      const [fileRecord] = await db.insert(files)
        .values({
          name: csvFileName,
          size: fileStats.size,
          type: 'text/csv',
          data: fileBuffer,
          user_id: userId,
          company_id: companyId,
          category: DocumentCategory.OTHER,
          metadata: {
            taskId,
            taskType: 'open_banking_survey',
            generated: true
          }
        })
        .returning();
      
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
        broadcastMessage({
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
      return 0;
    }
    
    const task = currentTask[0];
    const companyId = task.company_id;
    
    if (!companyId) {
      logger.warn('[OpenBankingRoutes] Task has no company ID, cannot unlock dependents', { taskId });
      return 0;
    }
    
    // Check if this is an open banking survey task
    if (task.task_type !== 'open_banking_survey') {
      logger.info('[OpenBankingRoutes] Not an open banking survey task, no dependents to unlock', { taskId, taskType: task.task_type });
      return 0;
    }
    
    // Find tasks that explicitly depend on this one via metadata
    // This handles direct dependencies specified in the task metadata
    const explicitDependentTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.company_id, companyId),
        eq(tasks.status, TaskStatus.LOCKED),
        sql`${tasks.metadata}->>'dependsOn' = ${taskId.toString()}`
      ));
    
    // Also find tasks that depend on the completion of open banking survey by task type
    // This handles implicit dependencies based on task type
    const implicitDependentTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.company_id, companyId),
        eq(tasks.status, TaskStatus.LOCKED),
        sql`${tasks.metadata}->>'dependsOnType' = 'open_banking_survey'`
      ));
    
    // Combine the lists, removing duplicates
    const dependentTaskIds = new Set([
      ...explicitDependentTasks.map(t => t.id),
      ...implicitDependentTasks.map(t => t.id)
    ]);
    
    const dependentTasks = await db.select().from(tasks)
      .where(inArray(tasks.id, Array.from(dependentTaskIds)));
    
    logger.info('[OpenBankingRoutes] Found dependent tasks', { 
      count: dependentTasks.length,
      taskIds: dependentTasks.map(t => t.id).join(',')
    });
    
    // Unlock each dependent task
    for (const depTask of dependentTasks) {
      await db.update(tasks)
        .set({
          status: TaskStatus.NOT_STARTED,
          updated_at: new Date()
        })
        .where(eq(tasks.id, depTask.id));
      
      logger.info('[OpenBankingRoutes] Unlocked dependent task', { taskId: depTask.id });
      
      // Broadcast task update via WebSocket
      broadcastMessage({
        type: 'task_updated',
        payload: {
          taskId: depTask.id,
          companyId: companyId,
          status: TaskStatus.NOT_STARTED
        }
      });
    }
    
    return dependentTasks.length;
  } catch (error) {
    logger.error('[OpenBankingRoutes] Error unlocking dependent tasks', { error, taskId });
    return 0;
  }
}