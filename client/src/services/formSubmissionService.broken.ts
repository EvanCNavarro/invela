/**
 * ========================================
 * Form Submission Service Module
 * ========================================
 * 
 * Enterprise form submission service providing comprehensive
 * form data processing, validation, and submission workflows.
 * Handles secure form data transmission, submission tracking,
 * and real-time status monitoring for enterprise compliance workflows.
 * 
 * Key Features:
 * - Secure form data submission with comprehensive validation
 * - Multi-format form support (KYB, KY3P, Open Banking)
 * - Real-time submission tracking and status monitoring
 * - Enterprise-grade error handling and retry mechanisms
 * - Structured logging for audit trails and compliance
 * - Metadata support for enhanced submission context
 * 
 * Dependencies:
 * - API: Secure API communication utilities
 * 
 * @module FormSubmissionService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// API utilities for secure form submission communication
import { apiRequest } from '../utils/api';

// ========================================
// CONSTANTS
// ========================================

/**
 * Form submission configuration constants
 * Defines submission behavior and processing parameters
 */
const SUBMISSION_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  SUBMISSION_TIMEOUT: 30000,
  MAX_FORM_SIZE: 5 * 1024 * 1024, // 5MB
  BATCH_SIZE: 100
} as const;

/**
 * Supported form types for enterprise compliance workflows
 * Ensures consistent form type validation and processing
 */
const SUPPORTED_FORM_TYPES = {
  KYB: 'kyb',
  KY3P: 'ky3p',
  OPEN_BANKING: 'open_banking',
  GENERAL: 'general'
} as const;

/**
 * Submission status enumeration for comprehensive tracking
 * Provides clear submission lifecycle management
 */
const SUBMISSION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Form submission interface for structured data processing
 * 
 * Provides comprehensive submission structure with validation,
 * metadata support, and tracking capabilities for enterprise
 * form processing workflows.
 */
export interface FormSubmission {
  /** Task identifier for submission tracking */
  taskId: number;
  /** Form type identifier for processing routing */
  formType: string;
  /** Form data payload for submission */
  formData: Record<string, any>;
  /** Optional metadata for submission context */
  metadata?: Record<string, any>;
  /** Submission timestamp for audit trails */
  submittedAt?: Date;
  /** Current submission status */
  status?: string;
}

/**
 * Submission response interface for comprehensive feedback
 * 
 * Structures API response data with status tracking, validation
 * results, and error handling for complete submission lifecycle management.
 */
export interface SubmissionResponse {
  /** Submission success status */
  success: boolean;
  /** Unique submission identifier */
  submissionId?: string;
  /** Current submission status */
  status: string;
  /** Validation results and messages */
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  /** Error information for failed submissions */
  error?: string;
  /** Additional response metadata */
  metadata?: Record<string, any>;
}

// ========================================
// SERVICE IMPLEMENTATION
// ========================================

/**
 * Submit form data for enterprise processing with comprehensive validation
 * 
 * Processes form submissions through secure API channels with validation,
 * error handling, and status tracking. Implements enterprise-grade
 * submission workflows with comprehensive audit trails and monitoring.
 * 
 * @param taskId Task identifier for submission tracking
 * @param formType Form type for processing routing (kyb, ky3p, open_banking)
 * @param formData Form data payload for submission
 * @param metadata Optional metadata for submission context
 * @returns Promise resolving to submission response with status and tracking
 * 
 * @throws {Error} When submission validation fails or API communication errors
 */
export async function submitForm(
  taskId: number,
  formType: string,
  formData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<SubmissionResponse> {
  // Validate input parameters for defensive programming
  if (!taskId || typeof taskId !== 'number' || taskId <= 0) {
    throw new Error('Invalid task ID provided for form submission');
  }

  if (!formType || typeof formType !== 'string') {
    throw new Error('Invalid form type provided for submission');
  }

  if (!formData || typeof formData !== 'object' || Object.keys(formData).length === 0) {
    throw new Error('Invalid or empty form data provided for submission');
  }

  // Validate form type against supported types
  const supportedTypes = Object.values(SUPPORTED_FORM_TYPES);
  if (!supportedTypes.includes(formType as any)) {
    console.warn(`Form type '${formType}' not in standard supported types:`, supportedTypes);
  }

  try {
    // Prepare submission payload with comprehensive structure
    const submissionPayload: FormSubmission = {
      taskId,
      formType,
      formData,
      metadata: {
        ...metadata,
        submissionTimestamp: new Date().toISOString(),
        clientVersion: '2.0.0'
      }
    };

    console.log('[FormSubmissionService] Submitting form:', {
      taskId,
      formType,
      dataKeys: Object.keys(formData),
      hasMetadata: !!metadata,
      timestamp: new Date().toISOString()
    });

    // Execute secure API submission
    const response = await apiRequest('/api/form-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionPayload),
    });

    console.log('[FormSubmissionService] Form submission completed:', {
      taskId,
      formType,
      success: response?.success,
      submissionId: response?.submissionId,
      timestamp: new Date().toISOString()
    });

    return response as SubmissionResponse;
  } catch (error) {
    console.error('[FormSubmissionService] Form submission failed:', {
      taskId,
      formType,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    // Re-throw with enhanced error context
    throw new Error(`Form submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check the status of a form submission
 * 
 * @param taskId The task ID to check
 * @returns Promise with the status response
 */
export async function checkSubmissionStatus(taskId: number) {
  return apiRequest(`/api/form-submission/status/${taskId}`);
}

/**
 * Retry a failed form submission
 * 
 * @param taskId The task ID to retry
 * @param formType The form type
 * @returns Promise with the retry response
 */
export async function retrySubmission(taskId: number, formType: string) {
  return apiRequest(`/api/form-submission/retry/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      formType,
    }),
  });
}

/**
 * Test function to broadcast a form submission event via WebSocket
 * This is used for testing only and should not be used in production
 * 
 * @param taskId The task ID
 * @param formType The form type
 * @param companyId The company ID
 * @returns Promise with the test response
 */
export async function testFormSubmissionBroadcast(
  taskId: number,
  formType: string,
  companyId: number
) {
  return apiRequest('/api/test/websocket/broadcast-form-submission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      formType,
      companyId,
    }),
  });
}

/**
 * Test function to broadcast a form error event via WebSocket
 * This is used for testing only and should not be used in production
 * 
 * @param taskId The task ID
 * @param formType The form type
 * @param companyId The company ID
 * @param errorMessage Optional error message
 * @returns Promise with the test response
 */
export async function testFormErrorBroadcast(
  taskId: number,
  formType: string,
  companyId: number,
  errorMessage?: string
) {
  return apiRequest('/api/test/websocket/broadcast-form-error', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      formType,
      companyId,
      errorMessage,
    }),
  });
}

/**
 * Test function to broadcast a form in-progress event via WebSocket
 * This is used for testing only and should not be used in production
 * 
 * @param taskId The task ID
 * @param formType The form type
 * @param companyId The company ID
 * @returns Promise with the test response
 */
export async function testFormInProgressBroadcast(
  taskId: number,
  formType: string,
  companyId: number
) {
  return apiRequest('/api/test/websocket/broadcast-in-progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      formType,
      companyId,
    }),
  });
}

/**
 * Function to send a direct WebSocket message for testing
 * This is used to test custom WebSocket message types
 * 
 * @param type The message type
 * @param payload The message payload
 * @returns Promise that resolves when the message is sent
 */
export async function sendWebSocketTestMessage(type: string, payload: any) {
  return apiRequest('/api/test/websocket/custom-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      payload,
    }),
  });
}

export default {
  submitForm,
  checkSubmissionStatus,
  retrySubmission,
  testFormSubmissionBroadcast,
  testFormErrorBroadcast,
  testFormInProgressBroadcast,
  sendWebSocketTestMessage,
};