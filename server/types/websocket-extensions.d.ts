/**
 * Type definition extensions for WebSocket message interfaces
 * 
 * This file extends existing interfaces with additional properties to ensure
 * compatibility between different module implementations.
 */

import '../utils/unified-websocket';

// Extend the FormSubmissionCompletedMessage interface with additional properties
declare module '../utils/unified-websocket' {
  interface FormSubmissionCompletedMessage {
    // These fields are used by form-submission-broadcaster.ts but not defined in the original interface
    submissionDate?: string;
    source?: string;
  }
}