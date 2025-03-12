
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Router, Route } from "wouter"; //Import necessary components
import CardTaskPage from "./pages/card-task-page";
import CardQuestionnairePage from "./pages/card-questionnaire-page";


const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

// Define and use a test URL to check route matching
const testUrl = "/task-center/task/card-DataTechCompany/questionnaire";
const routes = [
  { path: "/task-center/task/card-:companyName", component: CardTaskPage },
  { path: "/task-center/task/card-:companyName/questionnaire", component: CardQuestionnairePage },
];

console.log("[Router Debug] Registered routes:", routes);

// Calculate route resolution order
const routeResolutionOrder = routes.map(route => ({
  path: route.path,
  component: route.component.name
}));

console.log("[Router Debug] Route resolution order:", routeResolutionOrder);

// Test route matching for debug purposes
const matchingRoutes = routes
  .filter(route => {
    const pattern = route.path.replace(/:companyName/g, '([^/]+)');
    const regex = new RegExp(`^${pattern.replace(/\//g, '\\/')}$`);
    return regex.test(testUrl);
  })
  .map(route => ({
    path: route.path,
    component: route.component.name
  }));

console.log("[Router Debug] Routes matching test URL:", { url: testUrl, matches: matchingRoutes });

// Create custom router hook for debugging
// Import useLocation from wouter
import { useLocation } from "wouter";

const RouterWithDebug = (props) => {
  return (
    <Router hook={useLocation} {...props}>
      {props.children}
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
