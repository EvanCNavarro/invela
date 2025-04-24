import React, { useEffect, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingWrapper } from "@/components/OnboardingWrapper";
import { ToastProvider } from "@/components/ui/toast";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import ScrollToTop from "@/components/ScrollToTop";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { registerServices } from "./services/registerServices";
import TaskStatusDebugger from "@/pages/debug/status-fixer";
import WebSocketDebuggerPage from "@/pages/debug/websocket-debugger-page";

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
import DiagnosticPage from "@/pages/diagnostic-page";
import FormDebugPage from "@/pages/form-debug-page";
import { BuilderPage } from "@/pages/builder/BuilderPage";
import { OnboardingBuilderPage } from "@/pages/builder/sub-pages/OnboardingBuilderPage";
import { RiskRulesBuilderPage } from "@/pages/builder/sub-pages/RiskRulesBuilderPage";
import { ReportingBuilderPage } from "@/pages/builder/sub-pages/ReportingBuilderPage";
import { GroupsBuilderPage } from "@/pages/builder/sub-pages/GroupsBuilderPage";
import { ProtectedRoute } from "./lib/protected-route";
import TestFormUpdate from "./test-form-update";
import FormDbTestPage from "./form-db-test";
import FormPerformancePage from "@/pages/FormPerformancePage";
import ProgressiveLoadingDemo from "@/components/dev/ProgressiveLoadingDemo";

// Landing pages
import LandingPage from "@/pages/landing";
import AboutPage from "@/pages/landing/company/about";
import ContactUsPage from "@/pages/landing/company/contact-us";
import AccreditationPage from "@/pages/landing/products/accreditation";
import RiskScorePage from "@/pages/landing/products/risk-score";
import InvelaRegistryPage from "@/pages/landing/products/invela-registry";
import DataAccessGrantsServicePage from "@/pages/landing/products/data-access-grants-service";
import LiabilityInsurancePage from "@/pages/landing/products/liability-insurance";
import DisputeResolutionPage from "@/pages/landing/products/dispute-resolution";
import InsightsConsultingPage from "@/pages/landing/products/insights-consulting";
import PrivacyPolicyPage from "@/pages/landing/legal/privacy-policy";
import TermsOfUsePage from "@/pages/landing/legal/terms-of-use";
import CompliancePage from "@/pages/landing/legal/compliance";
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
    <div>
      <ScrollToTop />
      <Switch>
        {/* Landing Pages */}
        <Route path="/landing" component={LandingPage} />
        <Route path="/landing/company/about" component={AboutPage} />
        <Route path="/landing/company/contact-us" component={ContactUsPage} />
        <Route path="/landing/products/accreditation" component={AccreditationPage} />
        <Route path="/landing/products/risk-score" component={RiskScorePage} />
        <Route path="/landing/products/invela-registry" component={InvelaRegistryPage} />
        <Route path="/landing/products/data-access-grants-service" component={DataAccessGrantsServicePage} />
        <Route path="/landing/products/liability-insurance" component={LiabilityInsurancePage} />
        <Route path="/landing/products/dispute-resolution" component={DisputeResolutionPage} />
        <Route path="/landing/products/insights-consulting" component={InsightsConsultingPage} />
        <Route path="/landing/legal" component={LegalPage} />
        <Route path="/landing/legal/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/landing/legal/terms-of-use" component={TermsOfUsePage} />
        <Route path="/landing/legal/compliance" component={CompliancePage} />
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
        
        {/* Direct task ID routes - all redirect to task-center/task/:taskId for consistency */}
        <ProtectedRoute 
          path="/task/:taskId"
          component={({ params }: { params: { taskId: string } }) => {
            console.log('[Router] Redirecting from direct task route to nested task route');
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
        
        {/* Diagnostic Page - For Developers */}
        <Route path="/diagnostic">
          <DiagnosticPage />
        </Route>
        
        {/* Form Update Test Page - For Debugging */}
        <Route path="/test-form-update">
          <TestFormUpdate />
        </Route>
        
        {/* Form Debug Page - For Troubleshooting Form Data Issues */}
        <Route path="/form-debug">
          <FormDebugPage />
        </Route>
        
        {/* Form DB Test Page - For Testing Database Persistence */}
        <Route path="/form-db-test">
          <FormDbTestPage />
        </Route>
        
        {/* Form Performance Testing Page - For Optimizing Large Forms */}
        <Route path="/form-performance">
          <FormPerformancePage />
        </Route>
        
        {/* Progressive Loading Demo - For Testing Section-Based Loading */}
        <Route path="/progressive-loading-demo">
          <ProgressiveLoadingDemo />
        </Route>
        
        {/* Task Status Debug Tool - For Fixing Submission Status Issues */}
        <Route path="/debug/status-fixer">
          <ProtectedLayout>
            <OnboardingWrapper>
              <Suspense fallback={<div>Loading status debugger...</div>}>
                <TaskStatusDebugger />
              </Suspense>
            </OnboardingWrapper>
          </ProtectedLayout>
        </Route>

        {/* WebSocket Debugger - For Testing Real-time Updates */}
        <Route path="/debug/websocket">
          <ProtectedLayout>
            <OnboardingWrapper>
              <Suspense fallback={<div>Loading WebSocket debugger...</div>}>
                <WebSocketDebuggerPage />
              </Suspense>
            </OnboardingWrapper>
          </ProtectedLayout>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default function App() {
  // Register all form services when the app initializes
  useEffect(() => {
    console.log('[App] Registering form services at application startup');
    
    // Properly initialize services with explicit context to avoid deprecated warnings
    try {
      registerServices();
      
      // Initialize app-wide services with explicit context values
      // This prevents "Using deprecated default instance" warnings
      console.log('[App] Initializing core services with explicit context values');
      
      // Use the current user's company ID if available, or 0 for app-level context
      const appContext = { companyId: 0, taskId: 0 };
      console.log('[App] Using application context:', appContext);
    } catch (error) {
      console.error('[App] Error during service initialization:', error);
    }
  }, []);
  
  // Prevent automatic focus on any element when the application loads or refreshes
  useEffect(() => {
    // Function to override default focus behavior
    const preventAutoFocus = () => {
      // This will blur any element that might have received focus during page load
      if (document.activeElement instanceof HTMLElement && 
          document.activeElement !== document.body) {
        console.log('[App] Removing autofocus from', document.activeElement);
        document.activeElement.blur();
      }
    };
    
    // Apply immediately and after a small delay to catch delayed focus events
    preventAutoFocus();
    const timeoutId = setTimeout(preventAutoFocus, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  return (
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
