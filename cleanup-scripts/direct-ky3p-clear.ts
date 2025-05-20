/**
 * Direct KY3P Clear Function
 * 
 * This file provides a direct approach to clear KY3P tasks by directly
 * calling the server's transaction-based endpoint.
 * 
 * This bypasses the problematic bulk update API that was causing
 * "Invalid field ID format" errors.
 */

// Simple console logger for direct KY3P clear operations
const logger = {
  info: (message: string, ...args: any[]) => console.log(`%c${message}`, 'color: #2196F3', ...args),
  error: (message: string, ...args: any[]) => console.error(`%c${message}`, 'color: #F44336', ...args),
  warn: (message: string, ...args: any[]) => console.warn(`%c${message}`, 'color: #FF9800', ...args),
};

/**
 * Directly clear a KY3P task using the transaction-based server endpoint
 * 
 * @param taskId The task ID to clear
 * @returns Result of the clearing operation
 */
export async function directClearKy3pTask(taskId: number): Promise<{
  success: boolean;
  message: string;
  taskId: number;
}> {
  try {
    logger.info(`[DirectKY3PClear] Starting clear operation for task ${taskId}`);
    
    // Call the dedicated server endpoint that uses a transaction to 
    // properly delete responses and reset task status
    const response = await fetch(`/api/ky3p/clear/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Server error: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    
    logger.info(`[DirectKY3PClear] Successfully cleared task ${taskId}:`, result);
    
    return result;
  } catch (error) {
    logger.error(`[DirectKY3PClear] Error clearing task ${taskId}:`, error);
    
    // Re-throw to let caller handle it
    throw error;
  }
}