#!/bin/bash

# Test GET endpoint - Calculate progress without updating the database
echo "Testing GET /api/task-progress/695?taskType=open_banking"
curl -X GET "http://localhost:5000/api/task-progress/695?taskType=open_banking" -H "Content-Type: application/json"
echo "\n\n"

# Test POST endpoint - Calculate progress and update the database
echo "Testing POST /api/task-progress/695"
curl -X POST "http://localhost:5000/api/task-progress/695" \
  -H "Content-Type: application/json" \
  -d '{"taskType": "open_banking", "source": "test-script"}'
echo "\n"