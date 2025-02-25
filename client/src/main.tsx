import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

// Create a root and render the app
const root = createRoot(rootElement);
root.render(<App />);