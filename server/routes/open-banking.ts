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

// Helper function to unlock dependent tasks
async function unlockDependentTasks(taskId: number) {
  try {
    logger.info('[OpenBankingRoutes] Checking for dependent tasks to unlock', { taskId });
    
    // First, get the task to determine the company
    const taskData = await db.select().from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (taskData.length === 0) {
      logger.warn('[OpenBankingRoutes] Task not found when unlocking dependents', { taskId });
      return 0;
    }
    
    const companyId = taskData[0].company_id;
    
    if (!companyId) {
      logger.warn('[OpenBankingRoutes] Task has no company ID', { taskId });
      return 0;
    }
    
    // Find all locked tasks for this company that depend on this task
    const dependentTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.company_id, companyId),
        eq(tasks.status, TaskStatus.LOCKED),
        eq(tasks.dependency_task_id, taskId)
      ));
    
    logger.info('[OpenBankingRoutes] Found dependent tasks to unlock', { 
      taskId,
      dependentCount: dependentTasks.length,
      dependentIds: dependentTasks.map(t => t.id)
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

export function registerOpenBankingRoutes(app: Express, wss: WebSocketServer) {
  logger.info('[OpenBankingRoutes] Setting up routes...');

  /**
   * Endpoint to provide demo data for auto-filling Open Banking Survey forms
   * This follows the same pattern as the KYB and KY3P demo auto-fill endpoints
   */
  app.get('/api/open-banking/demo-autofill/:taskId', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized access to demo auto-fill');
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required' 
        });
      }
      
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      logger.info('[OpenBankingRoutes] Processing demo auto-fill request', { taskId });
      
      // Get the task data first to verify it exists and get the company
      const taskData = await db.select().from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      
      if (taskData.length === 0) {
        logger.error('[OpenBankingRoutes] Task not found for demo auto-fill', { taskId });
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const task = taskData[0];
      const companyId = task.company_id;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Task has no associated company' });
      }
      
      // Get company data for personalization
      const companyData = await db.select().from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (companyData.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      const company = companyData[0];
      
      // Get all Open Banking fields with demo_autofill data
      const fields = await db.select({
        id: openBankingFields.id,
        field_key: openBankingFields.field_key,
        display_name: openBankingFields.display_name,
        question: openBankingFields.question,
        field_type: openBankingFields.field_type,
        group: openBankingFields.group,
        required: openBankingFields.required,
        demo_autofill: openBankingFields.demo_autofill // Explicitly select demo_autofill
      })
      .from(openBankingFields)
      .orderBy(openBankingFields.order);
      
      logger.info('[OpenBankingRoutes] Fetched fields for demo auto-fill', {
        fieldCount: fields.length
      });
      
      // Create demo data for each field using demo_autofill values from the database
      const demoData: Record<string, any> = {};
      
      for (const field of fields) {
        const fieldKey = field.field_key;
        
        // Use the demo_autofill value directly from the database
        if (field.demo_autofill !== null && field.demo_autofill !== undefined) {
          // Replace {{COMPANY_NAME}} placeholder if present
          if (typeof field.demo_autofill === 'string' && field.demo_autofill.includes('{{COMPANY_NAME}}')) {
            demoData[fieldKey] = field.demo_autofill.replace('{{COMPANY_NAME}}', company.name);
          }
          // Use the value as-is
          else {
            demoData[fieldKey] = field.demo_autofill;
          }
        }
        // For fields without demo data, provide reasonable defaults
        else {
          console.log(`[Open Banking Demo Auto-Fill] No demo_autofill value found for ${fieldKey}`);
          
          // Default to empty string to prevent errors
          demoData[fieldKey] = '';
        }
      }
      
      // Add required agreement confirmation field
      demoData['agreement_confirmation'] = true;
      
      // Return the demo data
      res.json(demoData);
      
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error generating demo auto-fill data', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Failed to generate demo data' });
    }
  });

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
  
  /**
   * Get Open Banking task progress
   * This endpoint follows the same pattern as /api/ky3p/progress/:taskId
   * to ensure compatibility with the UniversalForm component
   */
  app.get('/api/open-banking/progress/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized access to progress', { taskId });
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
      
      logger.info('[OpenBankingRoutes] Fetching progress for task', { taskId });
      
      // Get the task data first
      const taskData = await db.select().from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      
      if (taskData.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const task = taskData[0];
      
      // Get all responses for this task
      const responses = await db.select().from(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId))
        .orderBy(openBankingResponses.id);
      
      // Format responses into a key-value object for the UniversalForm
      const formData: Record<string, any> = {};
      
      // Get all field definitions for mapping
      const fields = await db.select().from(openBankingFields);
      const fieldMap = new Map(fields.map(field => [field.id, field]));
      
      // Add each response to the form data using field_key as the key
      for (const response of responses) {
        const field = fieldMap.get(response.field_id);
        if (field) {
          formData[field.field_key] = response.response_value;
        }
      }
      
      // Return data in the format expected by the Universal Form
      res.json({
        formData,
        progress: task.progress || 0,
        status: task.status || 'not_started'
      });
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error fetching progress', { error, taskId });
      res.status(500).json({ error: 'Failed to fetch progress' });
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

  // Bulk update Open Banking responses (used by the save method in OpenBankingFormService)
  app.post('/api/tasks/:taskId/open-banking-responses/bulk', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { responses } = req.body;
    
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        logger.warn('[OpenBankingRoutes] Unauthorized access to bulk update', { taskId });
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
      
      logger.info('[OpenBankingRoutes] Processing bulk update for task', { 
        taskId, 
        responseKeys: Object.keys(responses || {}).length 
      });
      
      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({ error: 'Invalid responses format' });
      }
      
      // Get all field definitions for mapping keys to IDs
      const fields = await db.select().from(openBankingFields);
      const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
      
      // Process each response from the key-value object
      const processedCount = { updated: 0, created: 0, skipped: 0 };
      
      for (const [fieldKey, responseValue] of Object.entries(responses)) {
        // Skip if field key doesn't exist
        if (!fieldKeyToIdMap.has(fieldKey)) {
          logger.warn(`[OpenBankingRoutes] Field not found for key: ${fieldKey}`);
          processedCount.skipped++;
          continue;
        }
        
        const fieldId = fieldKeyToIdMap.get(fieldKey);
        
        // Check if a response already exists
        const existingResponse = await db.select()
          .from(openBankingResponses)
          .where(and(
            eq(openBankingResponses.task_id, taskId),
            eq(openBankingResponses.field_id, fieldId!)
          ))
          .limit(1);
        
        // Convert response value to string and trim
        const processedValue = responseValue?.toString().trim() || '';
        const status = processedValue ? KYBFieldStatus.COMPLETE : KYBFieldStatus.EMPTY;
        
        if (existingResponse.length > 0) {
          // Update existing response
          await db.update(openBankingResponses)
            .set({
              response_value: processedValue,
              status,
              version: existingResponse[0].version + 1,
              updated_at: new Date()
            })
            .where(eq(openBankingResponses.id, existingResponse[0].id));
          
          processedCount.updated++;
        } else {
          // Create new response
          await db.insert(openBankingResponses)
            .values({
              task_id: taskId,
              field_id: fieldId!,
              response_value: processedValue,
              status,
              version: 1
            });
          
          processedCount.created++;
        }
      }
      
      // Calculate task progress
      const totalFields = fields.length;
      
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
      
      logger.info('[OpenBankingRoutes] Bulk update completed', { 
        taskId, 
        stats: processedCount,
        progress
      });
      
      res.json({ 
        success: true, 
        taskId,
        progress,
        stats: processedCount,
        message: `Processed ${processedCount.updated + processedCount.created} responses`
      });
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error processing bulk update', { error, taskId });
      res.status(500).json({ error: 'Failed to process bulk update' });
    }
  });

  // Submit the Open Banking survey form and generate a CSV file
  app.post('/api/tasks/:taskId/open-banking-submit', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { formData, fileName } = req.body;
    
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
      
      // Get the company data for context
      const companyData = await db.select().from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (companyData.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      const company = companyData[0];
      
      // Get all fields to prepare the CSV
      const fields = await db.select().from(openBankingFields)
        .orderBy(openBankingFields.order);
      
      // Get all existing responses
      const responses = await db.select({
        fieldId: openBankingResponses.field_id,
        responseValue: openBankingResponses.response_value,
        fieldKey: openBankingFields.field_key,
        displayName: openBankingFields.display_name,
        question: openBankingFields.question,
        group: openBankingFields.group
      })
        .from(openBankingResponses)
        .leftJoin(openBankingFields, eq(openBankingResponses.field_id, openBankingFields.id))
        .where(eq(openBankingResponses.task_id, taskId));
      
      // Create CSV content
      let csvContent = 'Section,Field Name,Question,Response\n';
      
      // Sort responses by group and field order
      const fieldMap = new Map(fields.map(field => [field.id, field]));
      
      const sortedResponses = [...responses].sort((a, b) => {
        const fieldA = fieldMap.get(a.fieldId);
        const fieldB = fieldMap.get(b.fieldId);
        
        if (!fieldA || !fieldB) return 0;
        
        // Sort by group first, then by order within group
        if (fieldA.group !== fieldB.group) {
          return fieldA.group.localeCompare(fieldB.group);
        }
        
        return (fieldA.order || 0) - (fieldB.order || 0);
      });
      
      // Add each response to the CSV
      for (const response of sortedResponses) {
        // Escape quotes in values
        const section = (response.group || '').replace(/"/g, '""');
        const fieldName = (response.displayName || '').replace(/"/g, '""');
        const question = (response.question || '').replace(/"/g, '""');
        const value = (response.responseValue || '').replace(/"/g, '""');
        
        csvContent += `"${section}","${fieldName}","${question}","${value}"\n`;
      }
      
      // Generate a unique filename if none provided
      const submissionDate = new Date().toISOString().split('T')[0];
      const effectiveFileName = fileName || 
        `Open_Banking_Survey_${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_${submissionDate}.csv`;
      
      // Store the file
      const fileRecord = await db.insert(files)
        .values({
          name: effectiveFileName,
          company_id: companyId,
          task_id: taskId,
          content_type: 'text/csv',
          category: DocumentCategory.OPEN_BANKING_SURVEY,
          contents: csvContent,
          size: Buffer.from(csvContent).length,
          user_id: req.user?.id
        })
        .returning();
      
      if (fileRecord.length === 0) {
        throw new Error('Failed to create file record');
      }
      
      // Mark the task as submitted
      await db.update(tasks)
        .set({
          status: TaskStatus.SUBMITTED,
          updated_at: new Date(),
          progress: 1
        })
        .where(eq(tasks.id, taskId));
      
      // Unlock dependent tasks if any
      const unlockedTaskCount = await unlockDependentTasks(taskId);
      
      logger.info('[OpenBankingRoutes] Form submitted successfully', { 
        taskId, 
        fileId: fileRecord[0].id,
        unlockedTaskCount
      });
      
      // Return submission result
      res.json({
        success: true,
        fileId: fileRecord[0].id,
        fileName: effectiveFileName,
        message: 'Form submitted successfully',
        unlockedTaskCount
      });
    } catch (error) {
      logger.error('[OpenBankingRoutes] Error submitting form', { error, taskId });
      res.status(500).json({ error: 'Failed to submit form' });
    }
  });
}