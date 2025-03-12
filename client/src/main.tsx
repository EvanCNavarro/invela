import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Router, Route } from "wouter"; //Import necessary components
import CardTaskPage from "./pages/card-task-page";
import CardQuestionnairePage from "./pages/card-questionnaire-page";


const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <Router>
    <App>
      <Route path="/task-center/task/card-:companyName" component={CardTaskPage} />
      <Route path="/task-center/task/card-:companyName/questionnaire">
        {(params) => <CardQuestionnairePage />}
      </Route>
    </App>
  </Router>
);