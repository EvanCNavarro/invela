import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingWrapper } from "@/components/OnboardingWrapper";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import NetworkPage from "@/pages/network-page";
import TaskCenterPage from "@/pages/task-center-page";
import InsightsPage from "@/pages/insights-page";
import FileVault from "@/pages/FileVault";
import CompanyProfilePage from "@/pages/company-profile-page";
import PlaygroundPage from "@/pages/playground-page";
import { ProtectedRoute } from "./lib/protected-route";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Redirect to login if no user
  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Redirect authenticated users away from auth pages
  if (user && (location === "/login" || location === "/register")) {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/auth">
        {(params) => {
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');
          return <Redirect to={`/register${code ? `?code=${code}` : ''}`} />;
        }}
      </Route>
      <Route path="/">
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
      </Route>
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
      <ProtectedRoute 
        path="/playground" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <div className={cn(
                "min-h-screen",
                location === "/playground" && "bg-emerald-950/5"
              )}>
                <PlaygroundPage />
              </div>
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
      <AuthProvider>
        <ToastProvider>
          <Router />
          <Toaster />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}