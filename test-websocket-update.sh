#!/bin/bash

# Simple test script to trigger a task update via the API
# This will test our WebSocket broadcast and FormSubmissionListener

# Find a task to update
TASK_ID=$(curl -s http://localhost:5000/api/tasks?limit=1 | jq '.[0].id')

if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
  echo "No tasks found. Creating a new task..."
  
  # Create a test task
  TASK_RESPONSE=$(curl -s -X POST http://localhost:5000/api/tasks \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test WebSocket Task",
      "description": "This task is for testing WebSocket updates",
      "type": "kyb",
      "status": "in_progress",
      "progress": 50
    }')
  
  TASK_ID=$(echo $TASK_RESPONSE | jq '.id')
  echo "Created task with ID: $TASK_ID"
else
  echo "Found existing task with ID: $TASK_ID"
fi

# Update the task to submitted status
echo "Updating task $TASK_ID to 'submitted' status..."
curl -s -X PATCH http://localhost:5000/api/tasks/$TASK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "submitted",
    "progress": 100
  }'

echo ""
echo "Task update sent! Check the browser console for WebSocket messages."
echo "The FormSubmissionListener should receive a 'task_update' event with status 'submitted'"
echo "This should be mapped to a 'success' form submission status."