/**
 * Router for AI-powered form field suggestions and form step configuration
 */
import express, { Router } from 'express';
import { z } from 'zod';
import { db } from '@db';
import { requireAuth } from '../middleware/auth';
import { companies, kybFields, cardFields, securityFields } from '@db/schema';
import { eq, and, inArray, or } from 'drizzle-orm';
import { getFormFieldSuggestions } from '../services/openai';

// Create router
const router: Router = express.Router();

// Using appropriate paths for routes, prefixing is handled by the main router setup

// Define types for request and response
interface GetSuggestionsRequestBody {
  companyId: number;
  taskType: string;
  stepIndex: number;
  formData?: Record<string, any>;
}

interface SuggestionResponse {
  success: boolean;
  suggestions?: Record<string, { 
    value: string; 
    confidence: number;
    source?: string;
  }>;
  error?: string;
}

// Validation schema for request body
const suggestionRequestSchema = z.object({
  companyId: z.number().int().positive(),
  taskType: z.string().min(1),
  stepIndex: z.number().int().min(0),
  formData: z.record(z.string(), z.any()).optional()
});

/**
 * Endpoint to get AI suggestions for current form step
 */
router.post('/api/ai-suggestions', requireAuth, async (req, res) => {
  try {
    console.log('[AI Suggestions] Received request:', {
      body: req.body,
      user: { id: req.user?.id }
    });

    // Validate request body
    const validationResult = suggestionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('[AI Suggestions] Validation error:', validationResult.error);
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: validationResult.error.format()
      });
    }

    // Extract validated data
    const { companyId, taskType, stepIndex, formData = {} } = validationResult.data;
    
    // Get company data
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      return res.status(404).json({
        success: false, 
        error: 'Company not found'
      });
    }
    
    // Get fields based on task type
    let formFieldsData: any[] = [];
    
    if (taskType === 'company_kyb' || taskType.includes('kyb')) {
      formFieldsData = await db.select()
        .from(kybFields)
        .where(eq(kybFields.step_index, stepIndex));
    } else if (taskType === 'card_assessment' || taskType.includes('card')) {
      formFieldsData = await db.select()
        .from(cardFields)
        .where(eq(cardFields.step_index, stepIndex));
    } else if (taskType === 'security_assessment' || taskType.includes('security')) {
      formFieldsData = await db.select()
        .from(securityFields)
        .where(eq(securityFields.step_index, stepIndex));
    }
    
    if (!formFieldsData || formFieldsData.length === 0) {
      return res.status(404).json({
        success: false, 
        error: 'No fields found for this step'
      });
    }
    
    console.log(`[AI Suggestions] Found ${formFieldsData.length} fields for step ${stepIndex}`);
    
    // Format fields for OpenAI - handle different field formats from different tables
    const formattedFields = formFieldsData.map(field => ({
      field_key: field.field_key,
      question: field.question || field.label || field.question_label || field.field_key,
      field_type: field.field_type || (field.is_required ? 'required' : 'optional')
    }));
    
    // Get suggestions from OpenAI
    const suggestions = await getFormFieldSuggestions(
      company, 
      formattedFields,
      formData
    );
    
    console.log('[AI Suggestions] Generated suggestions successfully:', {
      count: Object.keys(suggestions).length,
      fields: Object.keys(suggestions)
    });
    
    // Return response
    return res.json({
      success: true,
      suggestions
    });
    
  } catch (error) {
    console.error('[AI Suggestions] Error generating suggestions:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Endpoint to get field configurations by task type and step index
 * Note: This is temporarily without auth for testing, should be re-added for production
 */
router.get('/api/form-fields/:taskType/:stepIndex', async (req, res) => {
  try {
    const { taskType, stepIndex } = req.params;
    const stepIndexNum = parseInt(stepIndex, 10);
    
    if (isNaN(stepIndexNum) || stepIndexNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step index'
      });
    }
    
    console.log(`[Form Fields] Fetching fields for task type ${taskType}, step ${stepIndexNum}`);
    
    // Get fields based on task type
    let formFieldsData: any[] = [];
    
    if (taskType === 'company_kyb' || taskType.includes('kyb')) {
      formFieldsData = await db.select()
        .from(kybFields)
        .where(eq(kybFields.step_index, stepIndexNum));
    } else if (taskType === 'card_assessment' || taskType.includes('card')) {
      formFieldsData = await db.select()
        .from(cardFields)
        .where(eq(cardFields.step_index, stepIndexNum));
    } else if (taskType === 'security_assessment' || taskType.includes('security')) {
      formFieldsData = await db.select()
        .from(securityFields)
        .where(eq(securityFields.step_index, stepIndexNum));
    }
    
    if (!formFieldsData || formFieldsData.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No fields found for task type ${taskType} at step ${stepIndexNum}`
      });
    }
    
    // Convert field data to uniform format for the frontend
    const formattedFields = formFieldsData.map(field => ({
      id: field.id,
      field_key: field.field_key,
      label: field.question || field.label || field.question_label || field.field_key,
      field_type: field.field_type || 'text',
      options: field.options || [],
      placeholder: field.placeholder || '',
      help_text: field.help_text || field.description || '',
      is_required: field.is_required || false,
      step_index: field.step_index,
      section: field.section || 'default',
      order: field.order_index || field.order || 0
    }));
    
    // Group fields by section
    const fieldsBySection = formattedFields.reduce((acc: Record<string, any[]>, field) => {
      const section = field.section || 'default';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(field);
      return acc;
    }, {});
    
    // Sort fields within each section by order
    Object.keys(fieldsBySection).forEach(section => {
      fieldsBySection[section].sort((a, b) => a.order - b.order);
    });
    
    return res.json({
      success: true,
      fields: formattedFields,
      fieldsBySection,
      stepIndex: stepIndexNum,
      taskType
    });
  } catch (error) {
    console.error(`[Form Fields] Error fetching fields:`, error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export const aiSuggestionsRouter = router;