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
  // Tracks when a manual reconnect was triggered
  _manual_reconnect_attempt?: number;
  // Tracks consecutive error code 1006 to help diagnose network issues
  _ws_1006_count?: number;
}
