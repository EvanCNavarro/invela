import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import WebSocket manager
import wsManager from "./lib/websocket-connector";

// Initialize the WebSocket connection
wsManager.initialize();

// Log WebSocket initialization in the console
console.info('[App] WebSocket connection manager initialized');

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(<App />);