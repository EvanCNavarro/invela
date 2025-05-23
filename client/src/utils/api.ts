/**
 * API Request Utility - HTTP client for backend communication
 * 
 * Provides standardized HTTP request functionality with authentication support,
 * error handling, and consistent response processing. Includes automatic JSON
 * parsing, credential management, and comprehensive error reporting for
 * reliable frontend-backend communication.
 * 
 * Features:
 * - Automatic authentication credential inclusion
 * - Standardized error handling with detailed logging
 * - JSON content type defaults with header merging
 * - Empty response handling for 204 status codes
 */

// ========================================
// CONSTANTS
// ========================================

/**
 * Default HTTP request configuration for API communication
 * Ensures consistent authentication and content type handling
 */
const DEFAULT_REQUEST_CONFIG: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
} as const;

/**
 * HTTP status codes for response handling
 */
const HTTP_STATUS = {
  NO_CONTENT: 204
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * API response data type for generic HTTP responses
 * Uses unknown for type safety requiring explicit casting
 */
type ApiResponseData = unknown;

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Execute HTTP API request with standardized configuration and error handling
 * 
 * Performs HTTP requests to backend endpoints with automatic authentication,
 * error handling, and response parsing. Supports all HTTP methods with
 * customizable headers and request options.
 * 
 * @param url - Target endpoint URL for the HTTP request
 * @param options - HTTP request configuration options
 * @returns Promise resolving to parsed response data or null for empty responses
 * 
 * @throws {Error} When HTTP request fails or returns error status codes
 */
export async function apiRequest(url: string, options: RequestInit = {}): Promise<ApiResponseData> {
  try {
    // Merge provided options with defaults
    const requestConfig: RequestInit = {
      ...DEFAULT_REQUEST_CONFIG,
      ...options,
      headers: {
        ...DEFAULT_REQUEST_CONFIG.headers,
        ...(options.headers || {})
      }
    };
    
    // Execute HTTP request
    const response = await fetch(url, requestConfig);
    
    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    // Handle empty content responses
    if (response.status === HTTP_STATUS.NO_CONTENT) {
      return null;
    }
    
    // Parse and return JSON response
    return await response.json();
    
  } catch (requestError: unknown) {
    const errorMessage = requestError instanceof Error ? requestError.message : String(requestError);
    throw new Error(`API request failed: ${errorMessage}`);
  }
}

// ========================================
// EXPORTS
// ========================================

export { apiRequest as default };