/**
 * Unified Form Response Handler
 * 
 * This utility provides standardized functions for form response processing 
 * across all form types (KYB, KY3P, Open Banking), ensuring consistent 
 * data handling, type safety, and error management.
 */

import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { kybResponses, ky3pResponses, openBankingResponses } from '@db/schema';

export type FormResponseType = 'kyb' | 'ky3p' | 'open_banking';

export interface FormResponse {
  field_key: string;
  field_id?: number | null;
  value: string | null;
  status: string;
  metadata?: Record<string, any>;
}

export interface StandardizedResponseValue {
  value: string | null;
  numericValue?: number | null;
  booleanValue?: boolean | null;
  status: string;
  fieldKey: string;
  fieldId?: number | null;
  metadata?: Record<string, any>;
}

interface ResponseProcessingContext {
  taskId: number;
  formType: FormResponseType;
  operation: string;
}

/**
 * Get the appropriate database table for the form type
 */
export function getResponseTableForFormType(formType: FormResponseType) {
  switch (formType) {
    case 'kyb':
      return kybResponses;
    case 'ky3p':
      return ky3pResponses;
    case 'open_banking':
      return openBankingResponses;
    default:
      throw new Error(`Unsupported form type: ${formType}`);
  }
}

/**
 * Create standardized response object from raw form data
 */
export function standardizeFormResponse(
  response: any,
  fieldKey: string,
  context: ResponseProcessingContext
): StandardizedResponseValue {
  const logContext = { 
    namespace: 'ResponseStandardization', 
    ...context, 
    fieldKey 
  };
  
  try {
    // Extract basic field information
    const fieldId = response.fieldId || null;
    const rawValue = response.value ?? null;
    const status = response.status || 'completed';
    const metadata = response.metadata || {};
    
    // Convert value to appropriate types
    let standardizedValue: string | null = null;
    let numericValue: number | null = null;
    let booleanValue: boolean | null = null;
    
    if (rawValue !== null && rawValue !== undefined) {
      // Handle different value types
      if (typeof rawValue === 'object') {
        // Convert objects to JSON string
        standardizedValue = JSON.stringify(rawValue);
      } else {
        // Convert primitive values to string
        standardizedValue = String(rawValue);
        
        // Try to extract numeric value
        if (standardizedValue === 'true' || standardizedValue === 'yes') {
          numericValue = 100;
          booleanValue = true;
        } else if (standardizedValue === 'false' || standardizedValue === 'no') {
          numericValue = 0;
          booleanValue = false;
        } else if (standardizedValue.includes('%')) {
          // Extract percentage value
          numericValue = parseFloat(standardizedValue.replace('%', ''));
        } else if (!isNaN(Number(standardizedValue))) {
          // Direct numeric value
          numericValue = Number(standardizedValue);
        }
      }
    }
    
    // Return standardized response
    return {
      value: standardizedValue,
      numericValue,
      booleanValue,
      status,
      fieldKey,
      fieldId,
      metadata
    };
  } catch (error) {
    logger.error('Error standardizing form response', {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return basic response with error flag in metadata
    return {
      value: null,
      status: 'error',
      fieldKey,
      metadata: { 
        processingError: true,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Prepare batch values for database insertion
 */
export function prepareBatchValues(
  responses: Record<string, any>,
  taskId: number,
  formType: FormResponseType
): any[] {
  const context: ResponseProcessingContext = {
    taskId,
    formType,
    operation: 'BatchPreparation'
  };
  
  const responseKeys = Object.keys(responses || {});
  const batchValues: any[] = [];
  
  // Process each response
  for (const fieldKey of responseKeys) {
    try {
      const rawResponse = responses[fieldKey];
      const standardized = standardizeFormResponse(rawResponse, fieldKey, context);
      
      // Add form-type specific processing
      const baseResponse = {
        task_id: taskId,
        field_id: standardized.fieldId,
        field_key: standardized.fieldKey,
        value: standardized.value,
        status: standardized.status,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: standardized.metadata || {}
      };
      
      // Form-type specific enhancements
      if (formType === 'open_banking') {
        // Add additional risk calculation metadata for Open Banking responses
        baseResponse.metadata = {
          ...baseResponse.metadata,
          categoryWeight: rawResponse.categoryWeight || standardized.metadata?.categoryWeight || 1,
          importanceLevel: rawResponse.importanceLevel || standardized.metadata?.importanceLevel || 'medium',
          validatedAt: new Date().toISOString()
        };
      } else if (formType === 'ky3p') {
        // Add special metadata useful for KY3P assessments
        if (standardized.numericValue !== null) {
          baseResponse.metadata.calculatedScore = standardized.numericValue;
        }
      }
      
      batchValues.push(baseResponse);
    } catch (error) {
      logger.error(`Error preparing batch value for field ${fieldKey}`, {
        namespace: 'BatchPreparation',
        taskId,
        formType,
        fieldKey,
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue with other responses
    }
  }
  
  return batchValues;
}

/**
 * Insert batch responses into the appropriate database table
 */
export async function insertBatchResponses(
  trx: any,
  batchValues: any[],
  formType: FormResponseType
): Promise<boolean> {
  if (!batchValues || batchValues.length === 0) {
    return true; // Nothing to insert
  }
  
  const logContext = {
    namespace: 'BatchInsertion',
    formType,
    count: batchValues.length
  };
  
  try {
    // Get the appropriate table for this form type
    const table = getResponseTableForFormType(formType);
    
    // Execute the insert operation
    const insertQuery = trx.insert(table).values(batchValues);
    await insertQuery;
    
    logger.info(`Successfully inserted ${batchValues.length} ${formType} responses`, logContext);
    return true;
  } catch (error) {
    logger.error(`Error inserting batch ${formType} responses`, {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Process all form responses in a unified way
 */
export async function processFormResponses(
  trx: any,
  taskId: number,
  formData: Record<string, any>,
  formType: FormResponseType
): Promise<number> {
  const logContext = {
    namespace: 'UnifiedResponseProcessing',
    taskId,
    formType
  };
  
  logger.info(`Processing ${formType} responses for task ${taskId}`, logContext);
  
  try {
    // Extract responses from form data
    const responses = formData.responses || {};
    const responseKeys = Object.keys(responses);
    
    if (responseKeys.length === 0) {
      logger.warn(`No ${formType} responses to process`, logContext);
      return 0;
    }
    
    // Prepare batch values
    const batchValues = prepareBatchValues(responses, taskId, formType);
    
    // Insert batch values
    await insertBatchResponses(trx, batchValues, formType);
    
    // Return count of processed responses
    return batchValues.length;
  } catch (error) {
    logger.error(`Error processing ${formType} responses`, {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}
