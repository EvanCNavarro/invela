/**
 * Browser Console Debug Script
 * 
 * This script captures and logs browser console messages to help with
 * debugging preview issues. It can be included in any HTML page.
 */
(function() {
  // Original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };

  // Array to store logs
  window.capturedLogs = [];
  
  // Max logs to keep
  const MAX_LOGS = 100;
  
  // Log levels
  const LogLevel = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    LOG: 'log'
  };
  
  // Capture timestamp and message
  function captureLog(level, ...args) {
    try {
      // Create a log entry
      const log = {
        timestamp: new Date().toISOString(),
        level: level,
        message: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch (err) {
            return `[Object conversion error: ${err.message}]`;
          }
        }).join(' ')
      };
      
      // Add to array, keeping only recent logs
      window.capturedLogs.push(log);
      if (window.capturedLogs.length > MAX_LOGS) {
        window.capturedLogs.shift();
      }
      
      // Send to server for logging
      if (level === LogLevel.ERROR) {
        sendLogToServer(log);
      }
    } catch (err) {
      // Don't break if there's an error in logging
      originalConsole.error('Error in log capture:', err);
    }
    
    // Call original console method
    return originalConsole[level].apply(console, args);
  }
  
  // Override console methods
  console.log = function() { return captureLog(LogLevel.LOG, ...arguments); };
  console.warn = function() { return captureLog(LogLevel.WARN, ...arguments); };
  console.error = function() { return captureLog(LogLevel.ERROR, ...arguments); };
  console.info = function() { return captureLog(LogLevel.INFO, ...arguments); };
  
  // Send log to server for analysis
  function sendLogToServer(log) {
    try {
      const blob = new Blob([JSON.stringify(log)], { type: 'application/json' });
      navigator.sendBeacon('/api/browser-logs', blob);
    } catch (err) {
      // Fall back to fetch if sendBeacon isn't supported
      try {
        fetch('/api/browser-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log),
          keepalive: true
        }).catch(err => {
          // Silently fail if fetch fails - we don't want to cause a loop
          originalConsole.error('Failed to send log:', err);
        });
      } catch (fetchErr) {
        // Silent failure
      }
    }
  }
  
  // Expose API to get logs
  window.getBrowserLogs = function() {
    return window.capturedLogs;
  };
  
  // Create a UI to show logs
  function createLogUI() {
    // Create floating button
    const button = document.createElement('button');
    button.innerText = 'Show Logs';
    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    // Create log panel (hidden initially)
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.bottom = '50px';
    panel.style.right = '10px';
    panel.style.width = '80%';
    panel.style.maxWidth = '600px';
    panel.style.maxHeight = '400px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    panel.style.color = 'white';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.overflowY = 'auto';
    panel.style.zIndex = '9998';
    panel.style.display = 'none';
    
    // Toggle panel visibility on button click
    button.addEventListener('click', function() {
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        updateLogPanel();
      } else {
        panel.style.display = 'none';
      }
    });
    
    // Add to document
    document.body.appendChild(button);
    document.body.appendChild(panel);
    
    // Update log panel with current logs
    function updateLogPanel() {
      panel.innerHTML = '';
      
      // Add control buttons
      const controls = document.createElement('div');
      controls.style.marginBottom = '10px';
      
      const refreshButton = document.createElement('button');
      refreshButton.innerText = 'Refresh';
      refreshButton.style.marginRight = '5px';
      refreshButton.style.padding = '4px 8px';
      refreshButton.style.backgroundColor = '#2196F3';
      refreshButton.style.color = 'white';
      refreshButton.style.border = 'none';
      refreshButton.style.borderRadius = '3px';
      refreshButton.style.cursor = 'pointer';
      refreshButton.addEventListener('click', updateLogPanel);
      
      const clearButton = document.createElement('button');
      clearButton.innerText = 'Clear';
      clearButton.style.padding = '4px 8px';
      clearButton.style.backgroundColor = '#f44336';
      clearButton.style.color = 'white';
      clearButton.style.border = 'none';
      clearButton.style.borderRadius = '3px';
      clearButton.style.cursor = 'pointer';
      clearButton.addEventListener('click', function() {
        window.capturedLogs = [];
        updateLogPanel();
      });
      
      controls.appendChild(refreshButton);
      controls.appendChild(clearButton);
      panel.appendChild(controls);
      
      // Add logs
      const logs = window.getBrowserLogs();
      
      if (logs.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.innerText = 'No logs captured yet.';
        panel.appendChild(emptyMessage);
        return;
      }
      
      logs.forEach(log => {
        const logEntry = document.createElement('div');
        
        // Set color based on log level
        switch (log.level) {
          case LogLevel.ERROR:
            logEntry.style.color = '#f44336';
            break;
          case LogLevel.WARN:
            logEntry.style.color = '#ff9800';
            break;
          case LogLevel.INFO:
            logEntry.style.color = '#2196f3';
            break;
          default:
            logEntry.style.color = '#ffffff';
        }
        
        // Format timestamp as HH:MM:SS
        const time = new Date(log.timestamp).toLocaleTimeString();
        
        // Add log entry
        logEntry.innerText = `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
        logEntry.style.marginBottom = '5px';
        logEntry.style.whiteSpace = 'pre-wrap';
        logEntry.style.wordBreak = 'break-word';
        
        panel.appendChild(logEntry);
      });
      
      // Auto-scroll to bottom
      panel.scrollTop = panel.scrollHeight;
    }
  }
  
  // Wait for DOM to be ready
  window.addEventListener('DOMContentLoaded', function() {
    console.info('[BrowserDebug] Console capture initialized');
    
    // Create UI after a short delay
    setTimeout(createLogUI, 1000);
    
    // Capture any network errors
    window.addEventListener('error', function(event) {
      console.error('[NetworkError]', event.message);
    });
  });
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    console.error('[UnhandledRejection]', event.reason);
  });
})();