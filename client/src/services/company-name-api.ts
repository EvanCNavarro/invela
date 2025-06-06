/**
 * ========================================
 * Company Name Generation API Service
 * ========================================
 * 
 * Frontend service for generating unique, professional company names using
 * the advanced backend combinatorial system. Replaces static hardcoded arrays
 * with dynamic API-generated names that guarantee database uniqueness.
 * 
 * Key Features:
 * - Async company name generation with error handling
 * - Comprehensive logging for debugging and monitoring
 * - TypeScript interfaces for type safety
 * - Fallback strategies for reliability
 * - Integration with existing demo flow patterns
 * 
 * Dependencies:
 * - Backend /api/demo/generate-company-name endpoint
 * - Frontend logging utilities
 * - Error handling patterns
 * 
 * @module services/company-name-api
 * @version 1.0.0
 * @since 2025-05-28
 */

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * API response structure from company name generation endpoint
 * Matches backend response format for type safety
 */
export interface CompanyNameApiResponse {
  success: boolean;
  companyName: string;
  wasModified: boolean;
  originalName: string;
  strategy: string;
  processingTime: number;
  timestamp: string;
  persona?: string;
  error?: string;
  details?: string;
  code?: string;
}

/**
 * Service configuration options for name generation
 * Allows customization of API behavior and fallback strategies
 */
export interface CompanyNameGenerationOptions {
  fallbackToTimestamp?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** 
   * Persona type for specialized name generation
   * Used to apply persona-specific naming rules (e.g., banking suffixes for data-provider)
   */
  persona?: string;
}

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================

/**
 * Default configuration for company name generation
 * Provides sensible defaults for production use
 */
const DEFAULT_OPTIONS: Required<CompanyNameGenerationOptions> = {
  fallbackToTimestamp: true,
  maxRetries: 3,
  timeoutMs: 5000,
  logLevel: 'info',
  persona: 'default'
};

/**
 * Emergency fallback names for extreme error scenarios
 * High-quality professional names as last resort
 */
const EMERGENCY_FALLBACK_NAMES = [
  'Apex Solutions',
  'Summit Technologies',
  'Pinnacle Group',
  'Meridian Partners',
  'Quantum Analytics'
];

// ========================================
// LOGGING UTILITIES
// ========================================

/**
 * Enhanced logging utility for company name API operations
 * Provides consistent, trackable log messages with structured data
 * 
 * @param level - Log level (debug, info, warn, error)
 * @param operation - The operation being performed
 * @param data - Additional structured data for debugging
 */
function logApiOperation(
  level: 'debug' | 'info' | 'warn' | 'error',
  operation: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    module: 'CompanyNameAPI',
    operation,
    ...data,
  };

  const logMessage = `[CompanyNameAPI] ${operation}`;
  
  switch (level) {
    case 'debug':
      console.debug(logMessage, logData);
      break;
    case 'info':
      console.log(logMessage, logData);
      break;
    case 'warn':
      console.warn(logMessage, logData);
      break;
    case 'error':
      console.error(logMessage, logData);
      break;
  }
}

// ========================================
// MAIN API SERVICE FUNCTIONS
// ========================================

/**
 * Generates a unique company name using the backend API
 * Handles errors gracefully with fallback strategies
 * 
 * @param options - Configuration options for generation
 * @returns Promise that resolves with a unique company name
 */
export async function generateUniqueCompanyName(
  options: CompanyNameGenerationOptions = {}
): Promise<string> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  logApiOperation('info', 'Starting company name generation request', {
    options: config,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });

  try {
    // Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    // Build API URL with persona parameter if provided
    const apiUrl = new URL('/api/demo/generate-company-name', window.location.origin);
    if (config.persona) {
      apiUrl.searchParams.set('persona', config.persona);
    }

    // Make API request with timeout
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data: CompanyNameApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API returned unsuccessful response');
    }

    const duration = Date.now() - startTime;
    
    logApiOperation('info', 'Successfully generated unique company name', {
      companyName: data.companyName,
      wasModified: data.wasModified,
      strategy: data.strategy,
      apiProcessingTime: data.processingTime,
      totalDuration: duration
    });

    return data.companyName;

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    logApiOperation('error', 'Company name generation API failed', {
      error: errorMessage,
      duration,
      willAttemptFallback: config.fallbackToTimestamp
    });

    // Implement fallback strategy
    if (config.fallbackToTimestamp) {
      const fallbackName = generateTimestampFallbackName();
      
      logApiOperation('warn', 'Using timestamp fallback strategy', {
        fallbackName,
        originalError: errorMessage
      });
      
      return fallbackName;
    }

    // Re-throw error if no fallback requested
    throw new Error(`Failed to generate company name: ${errorMessage}`);
  }
}

/**
 * Generates multiple unique company names for batch operations
 * Useful for pre-generating names or providing choices
 * 
 * @param count - Number of names to generate (max 10 for performance)
 * @param options - Configuration options for generation
 * @returns Promise that resolves with an array of unique company names
 */
export async function generateMultipleCompanyNames(
  count: number = 3,
  options: CompanyNameGenerationOptions = {}
): Promise<string[]> {
  const safeCount = Math.min(Math.max(count, 1), 10); // Limit between 1-10
  
  logApiOperation('info', 'Starting batch company name generation', {
    requestedCount: count,
    safeCount,
    options
  });

  const promises = Array.from({ length: safeCount }, () => 
    generateUniqueCompanyName(options)
  );

  try {
    const names = await Promise.all(promises);
    
    logApiOperation('info', 'Batch generation completed successfully', {
      generatedCount: names.length,
      names
    });
    
    return names;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    logApiOperation('error', 'Batch generation failed', {
      error: errorMessage,
      requestedCount: safeCount
    });
    
    // Return emergency fallback names for batch operations
    return EMERGENCY_FALLBACK_NAMES.slice(0, safeCount).map(name => 
      `${name} ${Date.now() + Math.random()}`
    );
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generates a timestamp-based fallback company name
 * Provides guaranteed uniqueness when API fails
 * 
 * @returns Unique company name with timestamp suffix
 */
function generateTimestampFallbackName(): string {
  const baseName = EMERGENCY_FALLBACK_NAMES[
    Math.floor(Math.random() * EMERGENCY_FALLBACK_NAMES.length)
  ];
  
  const timestamp = Date.now();
  const fallbackName = `${baseName} ${timestamp}`;
  
  logApiOperation('debug', 'Generated timestamp fallback name', {
    baseName,
    fallbackName,
    timestamp
  });
  
  return fallbackName;
}

/**
 * Validates that a company name meets minimum requirements
 * Ensures generated names are suitable for database storage
 * 
 * @param companyName - The company name to validate
 * @returns Validation result with error details if invalid
 */
export function validateCompanyName(companyName: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!companyName || typeof companyName !== 'string') {
    errors.push('Company name must be a non-empty string');
  } else {
    const trimmed = companyName.trim();
    
    if (trimmed.length < 2) {
      errors.push('Company name must be at least 2 characters long');
    }
    
    if (trimmed.length > 100) {
      errors.push('Company name must be less than 100 characters long');
    }
    
    if (!/^[a-zA-Z0-9\s&.-]+$/.test(trimmed)) {
      errors.push('Company name contains invalid characters');
    }
  }
  
  const isValid = errors.length === 0;
  
  logApiOperation('debug', 'Company name validation result', {
    companyName,
    isValid,
    errorCount: errors.length,
    errors: isValid ? [] : errors
  });
  
  return { isValid, errors };
}

// ========================================
// EXPORTED UTILITIES
// ========================================

/**
 * Default export for convenient importing
 */
export default {
  generateUniqueCompanyName,
  generateMultipleCompanyNames,
  validateCompanyName
};