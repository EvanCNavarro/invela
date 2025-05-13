/**
 * Direct WebSocket Usage Example
 * 
 * This example demonstrates how to properly use the WebSocket service
 * for tutorial progress updates from both client and server perspectives.
 */

// CLIENT-SIDE CODE EXAMPLE
// -----------------------
// This is how you would use the WebSocket hook in a React component

/*
import React, { useEffect } from 'react';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';

function TutorialComponent({ tabName }) {
  // Use the WebSocket hook to receive updates for this tab's tutorial
  const { tutorialProgress, tutorialCompleted } = useTutorialWebSocket(tabName);
  
  // React to WebSocket updates
  useEffect(() => {
    if (tutorialProgress) {
      console.log(`[Tutorial] Received progress update for ${tabName}:`, tutorialProgress);
      // Update UI based on the progress received
    }
    
    if (tutorialCompleted) {
      console.log(`[Tutorial] Tutorial for ${tabName} was marked as completed`);
      // Update UI to reflect completion
    }
  }, [tutorialProgress, tutorialCompleted, tabName]);
  
  return (
    <div>
      {tutorialProgress && (
        <div>
          <p>Current step: {tutorialProgress.currentStep} of {tutorialProgress.totalSteps}</p>
        </div>
      )}
    </div>
  );
}
*/

// SERVER-SIDE CODE EXAMPLE
// -----------------------
// This is how you would broadcast tutorial updates from the server

// Using the WebSocket service directly
/*
import { WebSocketService } from '../services/websocket-service';

// Get the WebSocket service instance
const webSocketService = WebSocketService.getInstance();

// Broadcast a tutorial progress update
function broadcastTutorialProgress(tabName, currentStep, totalSteps, userId) {
  const message = {
    type: 'tutorial_progress',
    timestamp: new Date().toISOString(),
    tabName,
    progress: {
      currentStep,
      totalSteps
    },
    // Include userId if you want to target a specific user
    userId
  };
  
  // Broadcast to all clients (or specific user if userId is provided)
  webSocketService.broadcastMessage(message);
}

// Broadcast a tutorial completion notification
function broadcastTutorialCompletion(tabName, userId) {
  const message = {
    type: 'tutorial_completed',
    timestamp: new Date().toISOString(),
    tabName,
    // Include userId if you want to target a specific user
    userId
  };
  
  // Broadcast to all clients (or specific user if userId is provided)
  webSocketService.broadcastMessage(message);
}
*/

// EXAMPLE OF HOW TO SEND MESSAGES FROM API ENDPOINTS
// -------------------------------------------------
/*
// In a route that updates tutorial progress
app.post('/api/user-tab-tutorials/:tabName/progress', async (req, res) => {
  try {
    const { tabName } = req.params;
    const { currentStep } = req.body;
    const userId = req.user.id;
    
    // Update the database
    await db.query(`
      UPDATE user_tab_tutorials
      SET current_step = $1, last_seen_at = NOW()
      WHERE user_id = $2 AND tab_name = $3
      RETURNING *
    `, [currentStep, userId, tabName]);
    
    // Get the total steps for this tutorial
    const totalSteps = 5; // This should be retrieved from your tutorial configuration
    
    // Broadcast the update
    broadcastTutorialProgress(tabName, currentStep, totalSteps, userId);
    
    res.json({ success: true, currentStep, totalSteps });
  } catch (error) {
    console.error('Error updating tutorial progress:', error);
    res.status(500).json({ error: 'Failed to update tutorial progress' });
  }
});

// In a route that marks a tutorial as completed
app.post('/api/user-tab-tutorials/:tabName/complete', async (req, res) => {
  try {
    const { tabName } = req.params;
    const userId = req.user.id;
    
    // Update the database
    await db.query(`
      UPDATE user_tab_tutorials
      SET completed = true, last_seen_at = NOW()
      WHERE user_id = $1 AND tab_name = $2
      RETURNING *
    `, [userId, tabName]);
    
    // Broadcast the completion
    broadcastTutorialCompletion(tabName, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error completing tutorial:', error);
    res.status(500).json({ error: 'Failed to mark tutorial as completed' });
  }
});
*/

// TESTING WITH CURL
// ----------------
// Here are some curl commands you can use to test the WebSocket tutorial functionality

/*
# Update tutorial progress
curl -X POST \
  http://localhost:3000/api/user-tab-tutorials/risk-score/progress \
  -H 'Content-Type: application/json' \
  -d '{"currentStep": 2}'

# Mark tutorial as completed
curl -X POST \
  http://localhost:3000/api/user-tab-tutorials/risk-score/complete \
  -H 'Content-Type: application/json' \
  -d '{}'
*/

// TROUBLESHOOTING
// --------------
// Common WebSocket issues and solutions

/*
1. Connection not established
   - Ensure the WebSocket server is running
   - Check that the URL is correct (ws:// for HTTP, wss:// for HTTPS)
   - Verify that the path is correct (/ws)
   - Check network traffic for errors

2. Message not received
   - Verify the message format matches what the listeners expect
   - Check that the client is properly subscribed to the correct message type
   - Ensure the message is being broadcast to all clients or the specific client

3. Authentication issues
   - Ensure the user's authentication token is included in the WebSocket connection
   - Verify that the server is validating the token correctly
   - Check that the user has permission to access the WebSocket server

4. Performance issues
   - Limit the frequency of messages to avoid overwhelming clients
   - Consider using a pub/sub system for high-volume applications
   - Implement reconnection logic with exponential backoff
*/