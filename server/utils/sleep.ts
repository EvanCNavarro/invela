/**
 * Sleep utility function
 * 
 * Simple promise-based sleep function to pause execution for a specified duration
 * Used for implementing controlled delays and backoff mechanisms.
 * 
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}