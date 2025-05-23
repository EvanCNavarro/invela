/**
 * ========================================
 * React Application Entry Point
 * ========================================
 * 
 * The main entry point for the enterprise risk assessment platform client application.
 * This file orchestrates the initialization of all core services, WebSocket connections,
 * and React rendering pipeline. It serves as the bridge between the browser environment
 * and the React application framework.
 * 
 * Key Responsibilities:
 * - React DOM root element initialization and rendering
 * - WebSocket connection manager startup for real-time communication
 * - Application-wide service registration and dependency injection
 * - Global styling and CSS framework integration
 * - Error boundary establishment for application-level error handling
 * 
 * Dependencies:
 * - React 18+ with createRoot API for concurrent features
 * - TanStack Query for server state management
 * - WebSocket infrastructure for real-time updates
 * - Application service layer for business logic
 * 
 * @module main
 * @version 1.0.0
 * @since 2025-05-23
 */

// ========================================
// IMPORTS
// ========================================

// React core rendering functionality
import { createRoot } from "react-dom/client";

// Main application component
import App from "./App";

// Global styling and CSS framework
import "./index.css";

// Data management and state infrastructure
import { queryClient } from "./lib/queryClient";
import { initializeAppServices } from "./lib/app-initialization";

// Real-time communication infrastructure
import wsManager from "./lib/websocket-connector";
import webSocketManager from "./lib/web-socket-manager";

// ========================================
// APPLICATION INITIALIZATION
// ========================================

/**
 * Initialize WebSocket Communication Systems
 * 
 * Bootstraps both legacy and unified WebSocket management systems
 * to ensure backwards compatibility during the transition period.
 * This dual initialization ensures reliable real-time communication
 * across all application features.
 */
function initializeWebSocketSystems(): void {
  try {
    // Legacy WebSocket system (maintained for backwards compatibility)
    wsManager.initialize();
    
    // Unified WebSocket system (new implementation)
    webSocketManager.connect();
    
    console.info('[Main] WebSocket connection managers initialized successfully');
  } catch (error) {
    console.error('[Main] Failed to initialize WebSocket systems:', error);
    throw new Error('Critical failure in WebSocket initialization');
  }
}

/**
 * Initialize Application Services
 * 
 * Bootstraps all application-wide services including data management,
 * form processing, and business logic components. This ensures all
 * dependencies are properly registered before React rendering begins.
 */
function initializeApplicationServices(): void {
  try {
    initializeAppServices(queryClient);
    console.info('[Main] Application services initialized successfully');
  } catch (error) {
    console.error('[Main] Failed to initialize application services:', error);
    throw new Error('Critical failure in service initialization');
  }
}

/**
 * Initialize React Application Root
 * 
 * Establishes the React DOM root element and renders the main application.
 * Includes proper error handling for missing DOM elements and rendering failures.
 */
function initializeReactApplication(): void {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    throw new Error('Failed to find the root element - DOM may not be ready');
  }

  try {
    createRoot(rootElement).render(<App />);
    console.info('[Main] React application rendered successfully');
  } catch (error) {
    console.error('[Main] Failed to render React application:', error);
    throw new Error('Critical failure in React application rendering');
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

/**
 * Main Application Bootstrap Sequence
 * 
 * Executes the complete application initialization in the proper order
 * to ensure all dependencies are available when needed. Uses a structured
 * approach with comprehensive error handling and logging.
 */
(function bootstrapApplication(): void {
  try {
    console.info('[Main] Starting application bootstrap sequence');
    
    // Step 1: Initialize WebSocket communication systems
    initializeWebSocketSystems();
    
    // Step 2: Initialize application-wide services
    initializeApplicationServices();
    
    // Step 3: Initialize and render React application
    initializeReactApplication();
    
    console.info('[Main] Application bootstrap completed successfully');
  } catch (error) {
    console.error('[Main] Critical failure during application bootstrap:', error);
    
    // Display user-friendly error message for production
    document.body.innerHTML = `
      <div style="
        display: flex; 
        justify-content: center; 
        align-items: center; 
        height: 100vh; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background-color: #f8f9fa;
        color: #495057;
        text-align: center;
      ">
        <div>
          <h1 style="color: #dc3545; margin-bottom: 1rem;">Application Initialization Failed</h1>
          <p style="margin-bottom: 1rem;">We encountered an error while starting the application.</p>
          <p style="font-size: 0.875rem; color: #6c757d;">Please refresh the page or contact support if the issue persists.</p>
        </div>
      </div>
    `;
  }
})();