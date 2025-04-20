// Add this code after line 1102 in server/routes/kyb.ts
// Right after: .where(eq(tasks.id, taskId));

// Broadcast submission status via WebSocket to ensure all clients
// receive notification, even if HTTP response fails
console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted`);
broadcastSubmissionStatus(taskId, 'submitted');
  
// Also broadcast the task update for dashboard real-time updates
broadcastTaskUpdate({
  id: taskId,
  status: TaskStatus.SUBMITTED,
  progress: 100,
  metadata: {
    lastUpdated: new Date().toISOString(),
    submissionDate: new Date().toISOString()
  }
});

// ----------------------------------------------------
// Later in the file, also add this to the submit endpoint 
// at the appropriate location (after task status update)
// ----------------------------------------------------

// Broadcast submission status via WebSocket
console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted`);
broadcastSubmissionStatus(taskId, 'submitted');

// Also broadcast the task update for dashboard real-time updates
broadcastTaskUpdate({
  id: taskId,
  status: TaskStatus.SUBMITTED,
  progress: 100,
  metadata: {
    lastUpdated: new Date().toISOString(),
    submissionDate: new Date().toISOString()
  }
});