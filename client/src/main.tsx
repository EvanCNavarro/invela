import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// WebSocket connection is now managed by the WebSocketProvider
// Log initialization in the console
console.info('[App] WebSocket service initialized via WebSocketProvider');

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(<App />);