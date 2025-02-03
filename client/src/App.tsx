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
import FileVault from "@/pages/FileVault";
import { ProtectedRoute } from "./lib/protected-route";
import { ToastProvider } from "@/hooks/use-toast";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <ProtectedRoute 
        path="/" 
        component={() => (
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        )} 
      />
      <ProtectedRoute 
        path="/registry" 
        component={() => (
          <ProtectedLayout>
            <RegistryPage />
          </ProtectedLayout>
        )} 
      />
      <ProtectedRoute 
        path="/task-center" 
        component={() => (
          <ProtectedLayout>
            <TaskCenterPage />
          </ProtectedLayout>
        )} 
      />
      <ProtectedRoute 
        path="/file-vault" 
        component={() => (
          <ProtectedLayout>
            <FileVault />
          </ProtectedLayout>
        )} 
      />
      <ProtectedRoute 
        path="/insights" 
        component={() => (
          <ProtectedLayout>
            <InsightsPage />
          </ProtectedLayout>
        )} 
      />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Router />
          <Toaster />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}