import React from 'react';

/**
 * This is a standalone debug page with minimal dependencies
 * to test rendering in Replit when other components fail
 */
export default function StandaloneDebugPage() {
  const [counter, setCounter] = React.useState(0);

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        Invela Replit Debug Page
      </h1>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#444' }}>Status</h2>
        <p>✅ Standalone debug page is rendering correctly!</p>
        <p>✅ React state is working: {counter}</p>
        <button 
          onClick={() => setCounter(c => c + 1)}
          style={{
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Increment Counter
        </button>
      </div>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#444' }}>Environment Info</h2>
        <div style={{ fontFamily: 'monospace', background: '#e5e5e5', padding: '8px', borderRadius: '4px' }}>
          <p>NODE_ENV: {process.env.NODE_ENV || 'not set'}</p>
          <p>VITE_REPLIT_MODE: {import.meta.env.VITE_REPLIT_MODE || 'not set'}</p>
          <p>Window Location: {window.location.pathname}</p>
        </div>
      </div>
      
      <div style={{ 
        background: '#fff3cd', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #ffeeba',
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#856404' }}>Troubleshooting</h2>
        <p>This page was created to diagnose rendering issues in Replit. If you're seeing this page, basic React rendering is working!</p>
        <p>The main application is likely facing issues with:</p>
        <ul>
          <li>Authentication cycle problems</li>
          <li>WebSocket connection issues</li>
          <li>API request handling</li>
          <li>Component rendering dependencies</li>
        </ul>
      </div>
    </div>
  );
}