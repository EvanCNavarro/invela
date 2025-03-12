import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Router, Route } from "wouter"; //Import necessary components
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
// Import useLocation from wouter
import { useLocation } from "wouter";

const RouterWithDebug = (props) => {
  return (
    <Router hook={useLocation} {...props}>
      {({ children }) => {
        const [location, navigate] = useLocation();
        
        console.log("[Router] Debug hook execution:", {
          currentLocation: location,
          timestamp: new Date().toISOString()
        });
        
        // Test all routes for current location
        if (window.location.pathname.startsWith('/task-center/task/card-')) {
          const isQuestionnaireRoute = location.endsWith('/questionnaire');
          
          console.log("[Router] Match attempt:", {
            path: location,
            questionnairePath: isQuestionnaireRoute,
            basePath: location.replace('/questionnaire', ''),
            timestamp: new Date().toISOString()
          });
          
          if (isQuestionnaireRoute) {
            const companyName = location.split('/card-')[1].replace('/questionnaire', '');
            console.log("[Router] Questionnaire route parameters:", { companyName });
          }
        }
        
        return children;
      }}
    </Router>
  );
};

createRoot(rootElement).render(
  <RouterWithDebug>
    <App>
      <Route path="/task-center/task/card-:companyName" component={CardTaskPage} />
      <Route path="/task-center/task/card-:companyName/questionnaire">
        {(params) => {
          console.log("[Router] Rendering CardQuestionnairePage with params:", params);
          return <CardQuestionnairePage params={params} />;
        }}
      </Route>
    </App>
  </RouterWithDebug>
);