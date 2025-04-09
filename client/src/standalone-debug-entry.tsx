import React from 'react';
import ReactDOM from 'react-dom/client';
import StandaloneDebugPage from './pages/standalone-debug';
import './index.css';

/**
 * This is a minimal entry point for the standalone debug page
 * It bypasses all other components and providers to test basic rendering
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StandaloneDebugPage />
  </React.StrictMode>
);