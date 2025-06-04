/**
 * ========================================
 * Tutorial Debug Utility - Development Support
 * ========================================
 * 
 * Comprehensive debugging tools for the tutorial system in the enterprise
 * risk assessment platform. Provides detailed logging, state tracking,
 * and diagnostic capabilities for tutorial development and troubleshooting.
 * 
 * @module lib/tutorial-debug
 * @version 1.0.0
 * @since 2025-05-23
 */

import { createTutorialLogger } from './tutorial-logger';

// Create a dedicated logger for deep debugging
const logger = createTutorialLogger('TutorialDebug');

// Storage for debug messages by category
const debugLogs: Record<string, any[]> = {
  api: [],
  hooks: [],
  render: [],
  lifecycle: [],
  state: [],
  websocket: [],
  navigation: []
};

// Max log entries per category
const MAX_LOGS = 100;

/**
 * Add a log entry to a specific category
 */
function addLog(category: keyof typeof debugLogs, message: string, data?: any) {
  if (!debugLogs[category]) {
    debugLogs[category] = [];
  }
  
  // Add timestamp to log
  const entry = {
    timestamp: new Date().toISOString(),
    message,
    data
  };
  
  // Add to logs and trim if necessary
  debugLogs[category].unshift(entry);
  if (debugLogs[category].length > MAX_LOGS) {
    debugLogs[category].pop();
  }
  
  // Also log to console with category
  logger.debug(`[${category.toUpperCase()}] ${message}`, data);
  
  // Dispatch debug event for any listeners
  dispatchDebugEvent(category, entry);
  
  return entry;
}

/**
 * Dispatch a debug event
 */
function dispatchDebugEvent(category: string, entry: any) {
  const event = new CustomEvent('tutorial-debug', {
    detail: {
      category,
      entry
    }
  });
  
  document.dispatchEvent(event);
}

/**
 * Get all logs for a specific category
 */
function getLogs(category?: keyof typeof debugLogs) {
  if (category) {
    return debugLogs[category] || [];
  }
  
  // Return all logs grouped by category
  return debugLogs;
}

/**
 * Clear logs for a category or all logs
 */
function clearLogs(category?: keyof typeof debugLogs) {
  if (category) {
    debugLogs[category] = [];
  } else {
    Object.keys(debugLogs).forEach(key => {
      debugLogs[key as keyof typeof debugLogs] = [];
    });
  }
}

/**
 * API call tracker
 */
const apiTracker = {
  log: (endpoint: string, method: string, data?: any, response?: any) => {
    addLog('api', `${method.toUpperCase()} ${endpoint}`, { data, response });
  },
  
  error: (endpoint: string, method: string, error: any) => {
    addLog('api', `ERROR: ${method.toUpperCase()} ${endpoint}`, { error });
  }
};

/**
 * Hook state tracker
 */
const hookTracker = {
  init: (hookName: string, initialState: any) => {
    addLog('hooks', `${hookName} initialized`, initialState);
  },
  
  update: (hookName: string, newState: any, prevState: any) => {
    addLog('hooks', `${hookName} state updated`, { 
      prevState, 
      newState,
      changes: getStateDiff(prevState, newState)
    });
  },
  
  effect: (hookName: string, dependencies: any[], message: string) => {
    addLog('hooks', `${hookName} effect: ${message}`, { dependencies });
  },
  
  cleanup: (hookName: string, message: string) => {
    addLog('hooks', `${hookName} cleanup: ${message}`);
  }
};

/**
 * Render tracker
 */
const renderTracker = {
  start: (componentName: string, props: any) => {
    addLog('render', `${componentName} render start`, { props });
  },
  
  complete: (componentName: string, result: string) => {
    addLog('render', `${componentName} render complete: ${result}`);
  },
  
  skip: (componentName: string, reason: string) => {
    addLog('render', `${componentName} render skipped: ${reason}`);
  }
};

/**
 * Component lifecycle tracker
 */
const lifecycleTracker = {
  mount: (componentName: string, props: any) => {
    addLog('lifecycle', `${componentName} mounted`, { props });
  },
  
  unmount: (componentName: string) => {
    addLog('lifecycle', `${componentName} unmounted`);
  },
  
  update: (componentName: string, prevProps: any, nextProps: any) => {
    addLog('lifecycle', `${componentName} updated`, { 
      prevProps, 
      nextProps,
      changes: getStateDiff(prevProps, nextProps)
    });
  }
};

/**
 * State tracker
 */
const stateTracker = {
  set: (componentName: string, stateName: string, value: any) => {
    addLog('state', `${componentName} set ${stateName}`, value);
  },
  
  update: (componentName: string, stateName: string, prevValue: any, nextValue: any) => {
    addLog('state', `${componentName} updated ${stateName}`, { 
      prevValue, 
      nextValue,
      changes: getStateDiff(prevValue, nextValue)
    });
  }
};

/**
 * WebSocket tracker
 */
const websocketTracker = {
  connect: (url: string) => {
    addLog('websocket', `Connected to ${url}`);
  },
  
  disconnect: (reason: string) => {
    addLog('websocket', `Disconnected: ${reason}`);
  },
  
  message: (data: any, isReceived: boolean) => {
    addLog('websocket', isReceived ? 'Received message' : 'Sent message', data);
  },
  
  error: (error: any) => {
    addLog('websocket', 'WebSocket error', error);
  }
};

/**
 * Navigation tracker
 */
const navigationTracker = {
  navigate: (from: string, to: string) => {
    addLog('navigation', `Navigation from ${from || 'unknown'} to ${to}`);
  },
  
  params: (path: string, params: any) => {
    addLog('navigation', `Route params for ${path}`, params);
  }
};

/**
 * Helper function to get difference between two states
 */
function getStateDiff(prevState: any, nextState: any) {
  if (!prevState || !nextState) return 'Cannot compare states';
  
  const changes: Record<string, { prev: any, next: any }> = {};
  
  // Look for all keys in either object
  const allKeys = new Set([
    ...Object.keys(prevState || {}),
    ...Object.keys(nextState || {})
  ]);
  
  // Check each key for differences
  allKeys.forEach(key => {
    if (JSON.stringify(prevState?.[key]) !== JSON.stringify(nextState?.[key])) {
      changes[key] = {
        prev: prevState?.[key],
        next: nextState?.[key]
      };
    }
  });
  
  return changes;
}

/**
 * Tutorial debug console
 */
function showDebugConsole() {
  // If already open, don't open another
  if (document.getElementById('tutorial-debug-console')) {
    return;
  }
  
  // Create console element
  const consoleElement = document.createElement('div');
  consoleElement.id = 'tutorial-debug-console';
  consoleElement.style.position = 'fixed';
  consoleElement.style.bottom = '0';
  consoleElement.style.right = '0';
  consoleElement.style.width = '600px';
  consoleElement.style.height = '400px';
  consoleElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  consoleElement.style.color = 'white';
  consoleElement.style.padding = '10px';
  consoleElement.style.fontFamily = 'monospace';
  consoleElement.style.fontSize = '12px';
  consoleElement.style.overflow = 'auto';
  consoleElement.style.zIndex = '9999';
  consoleElement.style.border = '1px solid #666';
  
  // Add title bar
  const titleBar = document.createElement('div');
  titleBar.style.display = 'flex';
  titleBar.style.justifyContent = 'space-between';
  titleBar.style.borderBottom = '1px solid #666';
  titleBar.style.paddingBottom = '5px';
  titleBar.style.marginBottom = '10px';
  
  const title = document.createElement('div');
  title.textContent = 'Tutorial Debug Console';
  title.style.fontWeight = 'bold';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.backgroundColor = 'transparent';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = () => {
    document.body.removeChild(consoleElement);
  };
  
  titleBar.appendChild(title);
  titleBar.appendChild(closeButton);
  consoleElement.appendChild(titleBar);
  
  // Add category buttons
  const categories = Object.keys(debugLogs);
  const categoryBar = document.createElement('div');
  categoryBar.style.display = 'flex';
  categoryBar.style.gap = '5px';
  categoryBar.style.marginBottom = '10px';
  
  categories.forEach(category => {
    const button = document.createElement('button');
    button.textContent = category;
    button.style.backgroundColor = '#333';
    button.style.border = '1px solid #666';
    button.style.color = 'white';
    button.style.padding = '3px 8px';
    button.style.cursor = 'pointer';
    button.onclick = () => {
      displayCategory(category);
    };
    
    categoryBar.appendChild(button);
  });
  
  consoleElement.appendChild(categoryBar);
  
  // Add content area
  const contentArea = document.createElement('div');
  contentArea.id = 'tutorial-debug-content';
  contentArea.style.height = 'calc(100% - 80px)';
  contentArea.style.overflow = 'auto';
  
  consoleElement.appendChild(contentArea);
  
  // Add to document
  document.body.appendChild(consoleElement);
  
  // Display first category by default
  displayCategory(categories[0]);
  
  // Function to display a category
  function displayCategory(category: string) {
    const contentArea = document.getElementById('tutorial-debug-content');
    if (!contentArea) return;
    
    contentArea.innerHTML = '';
    
    const logs = debugLogs[category as keyof typeof debugLogs] || [];
    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.style.marginBottom = '5px';
      logEntry.style.borderBottom = '1px solid #444';
      logEntry.style.paddingBottom = '5px';
      
      const timestamp = document.createElement('div');
      timestamp.style.color = '#999';
      timestamp.style.fontSize = '10px';
      timestamp.textContent = log.timestamp;
      
      const message = document.createElement('div');
      message.textContent = log.message;
      
      logEntry.appendChild(timestamp);
      logEntry.appendChild(message);
      
      if (log.data) {
        const dataToggle = document.createElement('button');
        dataToggle.textContent = 'Data ▼';
        dataToggle.style.backgroundColor = '#333';
        dataToggle.style.border = 'none';
        dataToggle.style.color = '#ccc';
        dataToggle.style.padding = '2px 5px';
        dataToggle.style.marginTop = '3px';
        dataToggle.style.cursor = 'pointer';
        
        const dataContent = document.createElement('pre');
        dataContent.style.display = 'none';
        dataContent.style.backgroundColor = '#222';
        dataContent.style.padding = '5px';
        dataContent.style.margin = '3px 0';
        dataContent.style.borderRadius = '3px';
        dataContent.style.maxHeight = '200px';
        dataContent.style.overflow = 'auto';
        dataContent.textContent = JSON.stringify(log.data, null, 2);
        
        dataToggle.onclick = () => {
          const isVisible = dataContent.style.display !== 'none';
          dataContent.style.display = isVisible ? 'none' : 'block';
          dataToggle.textContent = isVisible ? 'Data ▼' : 'Data ▲';
        };
        
        logEntry.appendChild(dataToggle);
        logEntry.appendChild(dataContent);
      }
      
      contentArea.appendChild(logEntry);
    });
  }
}

/**
 * Hide debug console
 */
function hideDebugConsole() {
  const consoleElement = document.getElementById('tutorial-debug-console');
  if (consoleElement) {
    document.body.removeChild(consoleElement);
  }
}

/**
 * Add keyboard shortcut to show/hide debug console
 */
function setupDebugKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+D to toggle debug console
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      const consoleElement = document.getElementById('tutorial-debug-console');
      if (consoleElement) {
        hideDebugConsole();
      } else {
        showDebugConsole();
      }
    }
  });
}

// Setup keyboard shortcuts
if (typeof window !== 'undefined') {
  setupDebugKeyboardShortcuts();
}

// Export debug utilities
const tutorialDebug = {
  api: apiTracker,
  hooks: hookTracker,
  render: renderTracker,
  lifecycle: lifecycleTracker,
  state: stateTracker,
  websocket: websocketTracker,
  navigation: navigationTracker,
  getLogs,
  clearLogs,
  showConsole: showDebugConsole,
  hideConsole: hideDebugConsole
};

export default tutorialDebug;