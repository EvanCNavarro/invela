import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Router } from "wouter";
import { useLocation } from "wouter";
import CardTaskPage from "./pages/card-task-page";
import CardQuestionnairePage from "./pages/card-questionnaire-page";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

// Debug all registered routes
const routeConfig = [
  { path: "/task-center/task/card-:companyName", component: "CardTaskPage", order: 2 },
  { path: "/task-center/task/card-:companyName/questionnaire", component: "CardQuestionnairePage", order: 1 }
];
console.log("[Router Debug] Registered routes:", routeConfig);
console.log("[Router Debug] Route resolution order:", [...routeConfig].sort((a, b) => a.order - b.order));

// Add route matching simulator
const testUrl = "/task-center/task/card-DataTechCompany/questionnaire";
const matchingRoutes = routeConfig.filter(route => {
  // Simple pattern matching (illustrative only)
  const pattern = route.path.replace(/:companyName/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(testUrl);
});
console.log("[Router Debug] Routes matching test URL:", { url: testUrl, matches: matchingRoutes });

// Create custom router hook for debugging
const RouterWithDebug = ({ children }) => {
  return (
    <Router hook={useLocation}>
      {children}
    </Router>
  );
};

createRoot(rootElement).render(
  <RouterWithDebug>
    <App />
  </RouterWithDebug>
);