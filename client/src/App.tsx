import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingWrapper } from "@/components/OnboardingWrapper";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import ConsoleCommands from "@/components/debug/ConsoleCommands";

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
import TaskPage from "@/pages/task-page";
import { BuilderPage } from "@/pages/builder/BuilderPage";
import { OnboardingBuilderPage } from "@/pages/builder/sub-pages/OnboardingBuilderPage";
import { RiskRulesBuilderPage } from "@/pages/builder/sub-pages/RiskRulesBuilderPage";
import { ReportingBuilderPage } from "@/pages/builder/sub-pages/ReportingBuilderPage";
import { GroupsBuilderPage } from "@/pages/builder/sub-pages/GroupsBuilderPage";
import { ProtectedRoute } from "./lib/protected-route";
import DebugPage from "@/pages/debug-page";
import AuthTestPage from "@/pages/auth-test-page";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  console.log('[Router] Current location:', location);

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/auth">
        {(params) => {
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');
          return <Redirect to={`/register${code ? `?code=${code}` : ''}`} />;
        }}
      </Route>

      {/* Dashboard route - Main route for authenticated users */}
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

      {/* Other protected routes */}
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

      <Route path="/network/company/:companySlug" component={({ params }) => (
        <ProtectedLayout>
          <OnboardingWrapper>
            <CompanyProfilePage />
          </OnboardingWrapper>
        </ProtectedLayout>
      )} />

      <Route path="/task-center/task/:taskSlug">
        {(params) => (
          <ProtectedRoute 
            path="/task-center/task/:taskSlug"
            component={() => (
              <ProtectedLayout>
                <TaskPage params={{ taskSlug: params.taskSlug }} />
              </ProtectedLayout>
            )}
          />
        )}
      </Route>

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
        path="/builder" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <BuilderPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />

      <ProtectedRoute 
        path="/builder/onboarding" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <OnboardingBuilderPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />

      <ProtectedRoute 
        path="/builder/risk-rules" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <RiskRulesBuilderPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />

      <ProtectedRoute 
        path="/builder/reporting" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <ReportingBuilderPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} 
      />

      <ProtectedRoute 
        path="/builder/groups" 
        component={() => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <GroupsBuilderPage />
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

      {/* Debug route - for development purposes */}
      <ProtectedRoute 
        path="/debug" 
        component={() => (
          <ProtectedLayout>
            <DebugPage />
          </ProtectedLayout>
        )} 
      />

      {/* Auth testing route */}
      <ProtectedRoute 
        path="/auth-test" 
        component={() => (
          <ProtectedLayout>
            <AuthTestPage />
          </ProtectedLayout>
        )} 
      />

      {/* Fallback 404 route */}
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
        {process.env.NODE_ENV === 'development' && <ConsoleCommands />}
      </AuthProvider>
    </QueryClientProvider>
  );
}