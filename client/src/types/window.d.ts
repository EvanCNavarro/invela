/**
 * Extended Window Interface
 * 
 * This file extends the global Window interface to include
 * our application-specific properties for WebSocket handling.
 */

interface Window {
  // WebSocket connection backoff status
  _ws_backoff_active?: boolean;
  _ws_last_attempt?: number;
}
