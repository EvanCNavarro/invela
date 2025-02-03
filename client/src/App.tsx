import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";

import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import RegistryPage from "@/pages/registry-page";
import TaskCenterPage from "@/pages/task-center-page";
import InsightsPage from "@/pages/insights-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/registry" component={RegistryPage} />
      <ProtectedRoute path="/task-center" component={TaskCenterPage} />
      <ProtectedRoute path="/insights" component={InsightsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}