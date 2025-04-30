/**
 * API Request Utility
 * 
 * This module provides a utility function for making API requests.
 */

/**
 * Make an API request
 * 
 * @param url The URL to fetch
 * @param options The fetch options
 * @returns Promise with the response data
 */
export async function apiRequest(url: string, options: RequestInit = {}): Promise<any> {
  try {
    // Default options with credentials and JSON content type
    const defaultOptions: RequestInit = {
      credentials: 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };
    
    // Merge headers if provided in options
    if (options.headers) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        ...options.headers,
      };
    }
    
    console.log(`[API] ${options.method || 'GET'} request to ${url}`);
    
    // Make the request
    const response = await fetch(url, defaultOptions);
    
    // Check for error response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error ${response.status}: ${errorText}`);
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }
    
    // Handle empty response
    if (response.status === 204) {
      return null;
    }
    
    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}