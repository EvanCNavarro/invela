import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingWrapper } from "@/components/OnboardingWrapper";
import { ToastProvider } from "@/components/ui/toast";
import { WebSocketProvider } from "@/providers/websocket-provider";
import ScrollToTop from "@/components/ScrollToTop";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import NetworkPage from "@/pages/network-page";
import TaskCenterPage from "@/pages/task-center-page";
import InsightsPage from "@/pages/insights-page";
import FileVault from "@/pages/FileVault";
import CompanyProfilePage from "@/pages/company-profile-page";
import TaskPage from "@/pages/task-page";
import { ProtectedRoute } from "./lib/protected-route";

// Landing pages
import LandingPage from "@/pages/landing";
import AboutPage from "@/pages/landing/company/about";
import AccreditationPage from "@/pages/landing/products/accreditation";
import PrivacyPolicyPage from "@/pages/landing/legal/privacy-policy";
import TermsOfUsePage from "@/pages/landing/legal/terms-of-use";
import LegalPage from "@/pages/landing/legal";
import SiteMapPage from "@/pages/landing/site-map";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  console.log('[Router] Current location:', location);

  return (
    <>
      <ScrollToTop />
      <Switch>
        {/* Landing Pages */}
        <Route path="/landing" component={LandingPage} />
        <Route path="/landing/company/about" component={AboutPage} />
        <Route path="/landing/products/accreditation" component={AccreditationPage} />
        <Route path="/landing/legal" component={LegalPage} />
        <Route path="/landing/legal/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/landing/legal/terms-of-use" component={TermsOfUsePage} />
        <Route path="/landing/site-map" component={SiteMapPage} />

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

        {/* Protected routes - Dashboard first */}
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
          path="/dashboard" 
          component={() => (
            <ProtectedLayout>
              <OnboardingWrapper>
                <DashboardPage />
              </OnboardingWrapper>
            </ProtectedLayout>
          )} 
        />

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

        <Route path="/network/company/:companySlug" component={({ params }: { params: { companySlug: string } }) => (
          <ProtectedLayout>
            <OnboardingWrapper>
              <CompanyProfilePage />
            </OnboardingWrapper>
          </ProtectedLayout>
        )} />

        {/* Main nested task route - will handle both task types and IDs */}
        <ProtectedRoute 
          path="/task-center/task/:taskSlug"
          component={({ params }: { params: { taskSlug: string } }) => (
            <ProtectedLayout>
              <TaskPage params={params} />
            </ProtectedLayout>
          )}
        />
        
        {/* Direct task ID route - redirects to task-center for consistency */}
        <ProtectedRoute 
          path="/task/:taskId"
          component={({ params }: { params: { taskId: string } }) => {
            console.log('[Router] Redirecting from direct task route to nested task route');
            // Simply redirect to the nested path with the same ID
            // The TaskPage component will handle both formats
            return <Redirect to={`/task-center/task/${params.taskId}`} />;
          }}
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

        {/* Builder and Playground routes removed */}

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <ToastProvider>
            <Router />
            <Toaster />
          </ToastProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}





    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <WebSocketProvider>
            <Router />
            <Toaster />
          </WebSocketProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
