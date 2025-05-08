/**
 * Form Submission Integration with WebSocket
 * 
 * This module integrates the WebSocket service with the unified form submission service
 * to broadcast real-time updates when forms are submitted.
 * 
 * Usage example:
 * ```
 * const { submitFormWithWebSocketNotification } = require('./services/form-submission-integration');
 * 
 * // In your form submission route handler
 * app.post('/api/forms/:formType/:taskId/submit', async (req, res) => {
 *   try {
 *     const result = await submitFormWithWebSocketNotification(
 *       taskId,
 *       formType,
 *       req.body,
 *       companyId
 *     );
 *     res.json(result);
 *   } catch (error) {
 *     res.status(500).json({ success: false, error: error.message });
 *   }
 * });
 * ```
 */

// Import the unified form submission service and WebSocket service
const { submitForm } = require('./unified-form-submission-service');
const { 
  broadcastFormSubmission, 
  broadcastTaskUpdate, 
  broadcastCompanyTabsUpdate 
} = require('./websocket-service');

/**
 * Submit a form with WebSocket notifications for real-time updates
 * 
 * This function handles the entire form submission process, including:
 * 1. Submitting the form through the unified form submission service
 * 2. Broadcasting the form submission result to relevant clients
 * 3. Broadcasting task status updates
 * 4. Broadcasting company tabs updates if applicable
 * 
 * @param {number|string} taskId - The ID of the task/form being submitted
 * @param {string} formType - The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param {Object} formData - The form data to submit
 * @param {number|string} companyId - The ID of the company the form belongs to
 * @param {string} transactionId - Optional transaction ID for tracking
 * @returns {Object} The result of the form submission
 */
async function submitFormWithWebSocketNotification(
  taskId,
  formType,
  formData,
  companyId,
  transactionId = null
) {
  try {
    console.log(`[FormSubmission] Processing form submission for task ${taskId} (${formType})`);
    
    // Submit the form using the unified form submission service
    const result = await submitForm(
      taskId,
      formType,
      formData,
      transactionId
    );
    
    // If submission was successful, broadcast updates via WebSocket
    if (result.success) {
      console.log(`[FormSubmission] Form submission successful for task ${taskId}`);
      
      // Broadcast form submission result to connected clients
      broadcastFormSubmission(taskId, formType, {
        ...result,
        companyId: companyId
      });
      
      // Broadcast task status update
      broadcastTaskUpdate(taskId, 'submitted', 100, {
        locked: true,
        submitted: true,
        submittedAt: new Date().toISOString()
      });
      
      // If tabs were unlocked, broadcast company tabs update
      if (result.unlockedTabs && result.unlockedTabs.length > 0) {
        broadcastCompanyTabsUpdate(companyId, result.unlockedTabs);
      }
    } else {
      console.error(`[FormSubmission] Form submission failed for task ${taskId}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error(`[FormSubmission] Error during form submission for task ${taskId}:`, error);
    
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}

/**
 * Clear form fields with WebSocket notification
 * 
 * This function clears form fields and broadcasts the update to connected clients
 * 
 * @param {number|string} taskId - The ID of the task/form
 * @param {string} formType - The type of form (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param {boolean} preserveProgress - Whether to preserve progress when clearing fields
 * @returns {Object} The result of the operation
 */
async function clearFormFieldsWithNotification(
  taskId,
  formType,
  preserveProgress = false
) {
  try {
    // Import the form field clearing function
    const { clearFormFields } = require('./form-field-service');
    
    // Clear the form fields
    const result = await clearFormFields(taskId, formType, preserveProgress);
    
    // If successful, broadcast task update
    if (result.success) {
      broadcastTaskUpdate(taskId, result.status || 'in_progress', result.progress || 0, {
        cleared: true,
        preservedProgress: preserveProgress,
        clearedAt: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error) {
    console.error(`[FormSubmission] Error clearing fields for task ${taskId}:`, error);
    throw error;
  }
}

module.exports = {
  submitFormWithWebSocketNotification,
  clearFormFieldsWithNotification
};