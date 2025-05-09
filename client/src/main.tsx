import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { initializeAppServices } from "./lib/app-initialization";

// Import WebSocket manager
import wsManager from "./lib/websocket-connector";
import webSocketManager from "./lib/web-socket-manager";

// Initialize WebSocket managers - keep both for backwards compatibility
wsManager.initialize();  // Legacy system
webSocketManager.connect(); // New unified system

// Initialize application-wide services
initializeAppServices(queryClient);

// Log initialization in the console
console.info('[App] WebSocket connection managers initialized');
console.info('[App] Application services initialized');

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(<App />);