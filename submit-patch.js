// Add before res.json in the /api/kyb/submit/:taskId endpoint
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