/**
 * Task WebSocket Routes
 * 
 * This module provides WebSocket routes for task-related updates
 * including progress calculations, status changes, and reconciliation.
 * 
 * It allows clients to subscribe to task updates and request progress
 * recalculation when inconsistencies are detected.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Request } from 'express';
import { parse } from 'url';
import { Server } from 'http';
import { db } from '@db';
import { tasks, companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { reconcileTaskProgress } from '../utils/task-reconciliation';
import { triggerManualReconciliation } from '../utils/periodic-task-reconciliation';
import { updateTaskProgress } from '../utils/progress';

// Extended WebSocket interface with client information
interface ExtendedWebSocket extends WebSocket {
  clientId?: string;
  userId?: number | null;
  companyId?: number | null;
}

/**
 * Configure WebSocket routes for task progress updates
 * 
 * @param server HTTP server instance
 * @param wss WebSocket server instance
 */
export function configureTaskWebSocketRoutes(server: Server, wss: WebSocketServer) {
  // Add a connection handler
  wss.on('connection', async (socket, request) => {
    try {
      // Parse URL to get query parameters
      const { query } = parse(request.url || '', true);
      const clientId = query.clientId as string || 'unknown';
      const userId = query.userId ? parseInt(query.userId as string) : null;
      const companyId = query.companyId ? parseInt(query.companyId as string) : null;
      
      console.log(`[TaskWebSocket] New client connected: ${clientId}`, {
        userId,
        companyId,
        timestamp: new Date().toISOString()
      });
      
      // Associate socket with clientId, userId, and companyId
      const extSocket = socket as ExtendedWebSocket;
      extSocket.clientId = clientId;
      extSocket.userId = userId;
      extSocket.companyId = companyId;
      
      // Listen for messages from the client
      socket.on('message', async (message) => {
        try {
          // Parse message as JSON
          const data = JSON.parse(message.toString());
          
          // Log incoming message
          console.log(`[TaskWebSocket] Received message from client ${clientId}:`, {
            type: data.type,
            timestamp: new Date().toISOString()
          });
          
          // Handle different message types
          switch (data.type) {
            case 'authenticate':
              // Handle authentication requests
              await handleAuthentication(socket as ExtendedWebSocket, data);
              break;
              
            case 'ping':
              // Handle ping messages (heartbeat)
              socket.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
              break;
              
            case 'reconcile-task-progress':
              // Trigger reconciliation for a specific task
              await handleTaskReconciliation(socket as ExtendedWebSocket, data.taskId);
              break;
              
            case 'reconcile-company-tasks':
              // Reconcile all tasks for a company
              await handleCompanyTaskReconciliation(socket as ExtendedWebSocket, data.companyId || companyId);
              break;
              
            case 'update-task-progress':
              // Manually update task progress
              await handleUpdateTaskProgress(socket as ExtendedWebSocket, data);
              break;
              
            default:
              // Send error for unknown message types
              socket.send(JSON.stringify({
                type: 'error',
                message: `Unknown message type: ${data.type}`,
                timestamp: new Date().toISOString()
              }));
          }
        } catch (error) {
          console.error('[TaskWebSocket] Error processing message:', error);
          
          // Send error response
          socket.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Error processing message',
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      // Handle disconnection
      socket.on('close', () => {
        console.log(`[TaskWebSocket] Client disconnected: ${clientId}`);
      });
      
      // Send initial connection confirmation
      socket.send(JSON.stringify({
        type: 'connected',
        clientId,
        userId,
        companyId,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[TaskWebSocket] Error handling connection:', error);
    }
  });
}

/**
 * Handle task progress reconciliation requests
 * 
 * @param socket WebSocket client
 * @param taskId Task ID to reconcile
 */
async function handleTaskReconciliation(socket: ExtendedWebSocket, taskId: number) {
  try {
    if (!taskId || isNaN(taskId)) {
      throw new Error('Invalid task ID');
    }
    
    console.log(`[TaskWebSocket] Reconciling task ${taskId}`);
    
    // Get current task data
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Send starting message
    socket.send(JSON.stringify({
      type: 'reconciliation-started',
      taskId,
      timestamp: new Date().toISOString()
    }));
    
    // Perform reconciliation
    await reconcileTaskProgress(taskId, { forceUpdate: true, debug: true });
    
    // Get updated task data
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    // Send completion message
    socket.send(JSON.stringify({
      type: 'reconciliation-completed',
      taskId,
      before: {
        progress: task.progress,
        status: task.status
      },
      after: {
        progress: updatedTask?.progress,
        status: updatedTask?.status
      },
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`[TaskWebSocket] Error reconciling task ${taskId}:`, error);
    
    // Send error message
    socket.send(JSON.stringify({
      type: 'reconciliation-error',
      taskId,
      message: error instanceof Error ? error.message : 'Error reconciling task',
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Handle company-wide task reconciliation requests
 * 
 * @param socket WebSocket client
 * @param companyId Company ID to reconcile tasks for
 */
async function handleCompanyTaskReconciliation(socket: ExtendedWebSocket, companyId: number) {
  try {
    if (!companyId || isNaN(companyId)) {
      throw new Error('Invalid company ID');
    }
    
    console.log(`[TaskWebSocket] Reconciling tasks for company ${companyId}`);
    
    // Check if company exists
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }
    
    // Find active tasks for the company
    const companyTasks = await db.select({ id: tasks.id, type: tasks.task_type })
      .from(tasks)
      .where(eq(tasks.company_id, companyId));
    
    // Send starting message
    socket.send(JSON.stringify({
      type: 'company-reconciliation-started',
      companyId,
      taskCount: companyTasks.length,
      timestamp: new Date().toISOString()
    }));
    
    // Extract task IDs
    const taskIds = companyTasks.map(task => task.id);
    
    // Trigger reconciliation for all tasks
    if (taskIds.length > 0) {
      await triggerManualReconciliation(taskIds);
    }
    
    // Send completion message
    socket.send(JSON.stringify({
      type: 'company-reconciliation-completed',
      companyId,
      taskCount: taskIds.length,
      taskIds,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`[TaskWebSocket] Error reconciling company tasks:`, error);
    
    // Send error message
    socket.send(JSON.stringify({
      type: 'company-reconciliation-error',
      companyId,
      message: error instanceof Error ? error.message : 'Error reconciling company tasks',
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Handle client authentication requests
 * 
 * @param socket WebSocket client
 * @param data Authentication data
 */
async function handleAuthentication(socket: ExtendedWebSocket, data: any) {
  try {
    // Extract authentication data
    const { userId, companyId, token } = data;
    
    // Log authentication attempt
    console.log(`[TaskWebSocket] Authentication attempt:`, {
      userId,
      companyId,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    });
    
    // Validate user ID if provided
    if (userId && !isNaN(parseInt(userId))) {
      socket.userId = parseInt(userId);
    }
    
    // Validate company ID if provided
    if (companyId && !isNaN(parseInt(companyId))) {
      socket.companyId = parseInt(companyId);
    }
    
    // TODO: In the future, implement token validation against the session store
    
    // Update clientId if available
    if (data.clientId) {
      socket.clientId = data.clientId;
    }
    
    // Send authentication response with both data and payload fields for compatibility
    // with different client implementations
    const timestamp = new Date().toISOString();
    socket.send(JSON.stringify({
      type: 'authenticated',
      userId: socket.userId,
      companyId: socket.companyId,
      clientId: socket.clientId,
      // Include both data and payload for compatibility
      data: {
        userId: socket.userId,
        companyId: socket.companyId,
        clientId: socket.clientId,
        status: 'authenticated',
        timestamp
      },
      payload: {
        userId: socket.userId,
        companyId: socket.companyId,
        clientId: socket.clientId,
        status: 'authenticated',
        timestamp
      },
      timestamp
    }));
    
    console.log(`[TaskWebSocket] Client authenticated:`, {
      clientId: socket.clientId,
      userId: socket.userId,
      companyId: socket.companyId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[TaskWebSocket] Authentication error:`, error);
    
    // Send error message with data and payload fields for compatibility
    const errorTimestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : 'Authentication error';
    socket.send(JSON.stringify({
      type: 'authentication-error',
      message: errorMessage,
      // Include data and payload fields for client compatibility
      data: {
        message: errorMessage,
        status: 'error',
        timestamp: errorTimestamp
      },
      payload: {
        message: errorMessage,
        status: 'error',
        timestamp: errorTimestamp
      },
      timestamp: errorTimestamp
    }));
  }
}

/**
 * Handle manual task progress update requests
 * 
 * @param socket WebSocket client
 * @param data Update data
 */
async function handleUpdateTaskProgress(socket: ExtendedWebSocket, data: any) {
  try {
    const { taskId, taskType } = data;
    
    if (!taskId || isNaN(taskId)) {
      throw new Error('Invalid task ID');
    }
    
    if (!taskType) {
      throw new Error('Task type is required');
    }
    
    console.log(`[TaskWebSocket] Manually updating task progress:`, {
      taskId,
      taskType,
      timestamp: new Date().toISOString()
    });
    
    // Get current task data
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Send starting message
    socket.send(JSON.stringify({
      type: 'progress-update-started',
      taskId,
      taskType,
      timestamp: new Date().toISOString()
    }));
    
    // Perform progress update
    await updateTaskProgress(taskId, taskType, { 
      debug: true, 
      metadata: {
        updateSource: 'websocket-manual-update',
        timestamp: new Date().toISOString(),
        requestedBy: data.userId || socket.userId
      }
    });
    
    // Get updated task data
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    // Send completion message
    socket.send(JSON.stringify({
      type: 'progress-update-completed',
      taskId,
      before: {
        progress: task.progress,
        status: task.status
      },
      after: {
        progress: updatedTask?.progress,
        status: updatedTask?.status
      },
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`[TaskWebSocket] Error updating task progress:`, error);
    
    // Send error message
    socket.send(JSON.stringify({
      type: 'progress-update-error',
      taskId: data?.taskId,
      message: error instanceof Error ? error.message : 'Error updating task progress',
      timestamp: new Date().toISOString()
    }));
  }
}
