import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingWrapper } from "@/components/OnboardingWrapper";
import { ToastProvider } from "@/components/ui/toast";

import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import NetworkPage from "@/pages/network-page";
import TaskCenterPage from "@/pages/task-center-page";
import InsightsPage from "@/pages/insights-page";
import FileVault from "@/pages/FileVault";
import CompanyProfilePage from "@/pages/company-profile-page";
import { ProtectedRoute } from "./lib/protected-route";

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
            <OnboardingWrapper>
              <DashboardPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />
      <ProtectedRoute 
        path="/network" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <NetworkPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />
      <Route 
        path="/network/company/:companySlug"
        component={({ params }) => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <CompanyProfilePage companySlug={params.companySlug} />
            </OnboardingWrapper>
          </ProtectedLayout>
        )}
      />
      <ProtectedRoute 
        path="/task-center" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <TaskCenterPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />
      <ProtectedRoute 
        path="/file-vault" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <FileVault />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />
      <ProtectedRoute 
        path="/insights" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <InsightsPage />
            </OnboardingWrapper>
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
      <ToastProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}