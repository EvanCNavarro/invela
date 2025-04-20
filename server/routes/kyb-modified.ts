/**
 * This file contains the KYB route modifications for file vault unlocking
 */

// Replace the normal file vault update with our service call
// In the first submission handler (around line 1044-1060)
function updateFirstHandler() {
  // Before: Get company record and update available_tabs manually
  /* REPLACE WITH:
  try {
    console.log(`[SERVER DEBUG] Unlocking file vault access for company ${taskId}`);
    const updatedCompany = await CompanyTabsService.unlockFileVault(taskId);
    
    if (updatedCompany) {
      console.log(`[SERVER DEBUG] Successfully updated company tabs:`, {
        companyId: taskId,
        availableTabs: updatedCompany.available_tabs,
        timestamp: new Date().toISOString()
      });
      // Broadcast updates to all connected clients
      broadcastSubmissionStatus(taskId, {
        fileVaultUnlocked: true,
        availableTabs: updatedCompany.available_tabs
      });
    } else {
      console.error(`[SERVER ERROR] Failed to unlock file vault for company ${taskId}`);
      // Broadcast update failure
      broadcastTaskUpdate(taskId, {
        status: TaskStatus.PENDING_REVIEW,
        fileVaultError: true
      });
    }
  } catch (tabError) {
    // Log but don't fail the entire request if tab updating fails
    console.error(`[SERVER ERROR] Error updating company tabs:`, {
      error: tabError instanceof Error ? tabError.message : String(tabError),
      companyId: taskId,
      timestamp: new Date().toISOString()
    });
  }
  */
}

// In the second submission handler (around line 1759-1775)
function updateSecondHandler() {
  // Before: Get company record and update available_tabs manually  
  /* REPLACE WITH:
  try {
    console.log(`[SERVER DEBUG] Unlocking file vault access for company ${taskId}`);
    const updatedCompany = await CompanyTabsService.unlockFileVault(taskId);
    
    if (updatedCompany) {
      console.log(`[SERVER DEBUG] Successfully updated company tabs:`, {
        companyId: taskId,
        availableTabs: updatedCompany.available_tabs,
        timestamp: new Date().toISOString()
      });
      // Broadcast updates to all connected clients
      broadcastSubmissionStatus(taskId, {
        fileVaultUnlocked: true,
        availableTabs: updatedCompany.available_tabs
      });
    } else {
      console.error(`[SERVER ERROR] Failed to unlock file vault for company ${taskId}`);
      // Broadcast update failure
      broadcastTaskUpdate(taskId, {
        status: TaskStatus.PENDING_REVIEW,
        fileVaultError: true
      });
    }
  } catch (tabError) {
    // Log but don't fail the entire request if tab updating fails
    console.error(`[SERVER ERROR] Error updating company tabs:`, {
      error: tabError instanceof Error ? tabError.message : String(tabError),
      companyId: taskId,
      timestamp: new Date().toISOString()
    });
  }
  */
}

// Endpoint to export KYB data as CSV
router.post('/api/kyb/export-csv', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        message: "Task ID is required"
      });
    }
    
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }
    
    // Get all KYB fields
    const fields = await db.select()
      .from(kybFields)
      .orderBy(sql`"group" ASC, "order" ASC`);
      
    // Get all responses for this task
    const responses = await db.select()
      .from(kybResponses)
      .where(eq(kybResponses.task_id, taskId));
      
    // Convert responses to a form data object
    const formData = {};
    for (const response of responses) {
      const field = fields.find(f => f.id === response.field_id);
      if (field && response.response_value) {
        formData[field.field_key] = response.response_value;
      }
    }
    
    // Generate CSV content
    const csvContent = convertResponsesToCSV(fields, formData);
    
    // Create a temp file to store the CSV
    const fileName = `kyb_export_${taskId}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting KYB data as CSV:', error);
    res.status(500).json({
      message: "Failed to export KYB data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});