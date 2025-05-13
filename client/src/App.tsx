import React, { useEffect, Suspense, useState } from "react";
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
import { DashboardLayout } from "@/layouts/DashboardLayout";

// Import new unified services and phased startup components
import { initializeServices } from "./services/unified-service-registration";
import { phaseStartup, StartupPhase } from "./utils/phased-startup";
import getLogger from "./utils/standardized-logger";

// Legacy imports - will be eventually removed
import { registerServices } from "./services/registerServices";
import { registerStandardizedServices, useStandardizedServices } from "./services/register-standardized-services";
import FormSubmissionWorkflowPage from "@/pages/form-submission-workflow";

import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import NetworkPage from "@/pages/network-page";
import TaskCenterPage from "@/pages/task-center-page";
import InsightsPage from "@/pages/insights-page";
import FileVault from "@/pages/FileVault";
import CompanyProfilePage from "@/pages/company-profile-page";
// Removed playground page import
import TaskPage from "@/pages/task-page";
import KY3PTaskPage from "@/pages/ky3p-task-page";
import OpenBankingTaskPage from "@/pages/open-banking-task-page";
import DiagnosticPage from "@/pages/diagnostic-page";
import RiskScorePage from "@/pages/risk-score-page";
import ClaimsRiskPage from "@/pages/claims-risk-page";
// Builder pages have been removed
// Empty component definitions for type checking - these components are no longer used
const BuilderPage = () => null;
const OnboardingBuilderPage = () => null;
const RiskRulesBuilderPage = () => null;
const ReportingBuilderPage = () => null;
const GroupsBuilderPage = () => null;
import { ProtectedRoute } from "./lib/protected-route";

// Landing pages
import LandingPage from "@/pages/landing";
import AboutPage from "@/pages/landing/company/about";
import ContactUsPage from "@/pages/landing/company/contact-us";
import AccreditationPage from "@/pages/landing/products/accreditation";
import RiskScoreLandingPage from "@/pages/landing/products/risk-score";
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
import RiskScoreConfigurationPage from "@/pages/risk-score-configuration-page";
import ClaimsPage from "@/pages/claims";
import ClaimDetailsPage from "@/pages/claims/[id]";

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
        <Route path="/landing/products/risk-score" component={RiskScoreLandingPage} />
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

        {/* Builder routes have been removed */}

        <ProtectedRoute 
          path="/risk-score-configuration" 
          component={() => (
            <ProtectedLayout>
              <DashboardLayout>
                <OnboardingWrapper>
                  <RiskScoreConfigurationPage />
                </OnboardingWrapper>
              </DashboardLayout>
            </ProtectedLayout>
          )} 
        />

        <ProtectedRoute 
          path="/claims" 
          component={() => (
            <ProtectedLayout>
              <OnboardingWrapper>
                <ClaimsPage />
              </OnboardingWrapper>
            </ProtectedLayout>
          )} 
        />
        
        <ProtectedRoute 
          path="/claims/:claimId" 
          component={({ params }: { params: { claimId: string } }) => (
            <ProtectedLayout>
              <OnboardingWrapper>
                <ClaimsPage />
              </OnboardingWrapper>
            </ProtectedLayout>
          )} 
        />

        <ProtectedRoute 
          path="/risk-score" 
          component={() => (
            <ProtectedLayout>
              <OnboardingWrapper>
                <RiskScorePage />
              </OnboardingWrapper>
            </ProtectedLayout>
          )} 
        />

        <ProtectedRoute 
          path="/claims-risk" 
          component={() => (
            <ProtectedLayout>
              <OnboardingWrapper>
                <ClaimsRiskPage />
              </OnboardingWrapper>
            </ProtectedLayout>
          )} 
        />

        {/* Playground route removed during cleanup */}
        
        {/* Diagnostic Page - For Developers */}
        <Route path="/diagnostic">
          <DiagnosticPage />
        </Route>
        
        {/* Removed test route */}
        
        {/* Form Submission Workflow Page - For Full Submission Workflow Demo */}
        <Route path="/form-submission-workflow">
          <ProtectedLayout>
            <OnboardingWrapper>
              <FormSubmissionWorkflowPage />
            </OnboardingWrapper>
          </ProtectedLayout>
        </Route>
        
        {/* Specialized task routes for form types */}
        <ProtectedRoute 
          path="/ky3p-task/:taskId"
          component={({ params }: { params: { taskId: string } }) => (
            <ProtectedLayout>
              <OnboardingWrapper>
                <KY3PTaskPage />
              </OnboardingWrapper>
            </ProtectedLayout>
          )}
        />
        
        <ProtectedRoute 
          path="/open-banking-task/:taskId"
          component={({ params }: { params: { taskId: string } }) => (
            <ProtectedLayout>
              <OnboardingWrapper>
                <OpenBankingTaskPage />
              </OnboardingWrapper>
            </ProtectedLayout>
          )}
        />
        
        {/* Debug routes removed */}

        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

// App logger created with the standardized logger
const logger = getLogger('App');

export default function App() {
  // Track application startup phase
  const [startupPhase, setStartupPhase] = useState<StartupPhase>('framework');

  // Implement phased startup with OODA loop principles
  useEffect(() => {
    /**
     * OODA Loop approach to application initialization:
     * - Observe: Track startup phases and dependencies
     * - Orient: Organize initialization in logical phases
     * - Decide: Determine correct execution order
     * - Act: Execute each phase in sequence
     */
    logger.info('Initializing application with phased startup approach');
    
    // Phase 1: Framework - React framework and core providers
    phaseStartup.registerPhaseCallback('framework', async () => {
      logger.info('Framework phase initializing');
      setStartupPhase('framework');
      // Framework initialization happens automatically with React
    });
    
    // Phase 2: Context - User and company contexts
    phaseStartup.registerPhaseCallback('context', async () => {
      logger.info('Context phase initializing');
      setStartupPhase('context');
      // Context initialization happens in providers
    });
    
    // Phase 3: Services - Form services and business logic
    phaseStartup.registerPhaseCallback('services', async () => {
      logger.info('Services phase initializing');
      setStartupPhase('services');
      
      try {
        // KISS: Use only one service registration system to avoid conflicts
        // This is a critical fix to prevent double registration of services
        logger.info('Initializing unified service registration');
        // Only use the unified registration, not both
        initializeServices();
        
        // Legacy service registration is commented out to avoid conflict
        // Previously this would override the unified registration and cause issues
        // logger.info('Initializing legacy services for compatibility');
        // registerStandardizedServices();
      } catch (error) {
        logger.error('Error during service initialization:', 
          error instanceof Error ? error.message : String(error));
      }
    });
    
    // Phase 4: Communication - WebSocket and real-time updates
    phaseStartup.registerPhaseCallback('communication', async () => {
      logger.info('Communication phase initializing');
      setStartupPhase('communication');
      // WebSocket initialization happens in provider
    });
    
    // Phase 5: Ready - Application ready for user interaction
    phaseStartup.registerPhaseCallback('ready', async () => {
      logger.info('Application ready for user interaction');
      setStartupPhase('ready');
      
      // This is a critical fix - the ready phase never completed because
      // it wasn't explicitly resolving its promise
      // No need to wait for anything else - mark app as ready immediately
      return Promise.resolve();
    });
    
    // Start the phased initialization
    phaseStartup.start();
    
    // Establish a fallback in case the ready phase never completes on its own
    // This ensures the UI is usable even if some initialization steps fail
    const readyFallback = setTimeout(() => {
      if (!phaseStartup.isPhaseComplete('ready')) {
        logger.info('Forcing ready state via fallback mechanism');
        setStartupPhase('ready');
      }
    }, 5000);  // Wait 5 seconds for normal completion before forcing ready state
    
    return () => clearTimeout(readyFallback);
  }, []);
  
  // Prevent automatic focus on any element when the application loads or refreshes
  useEffect(() => {
    // Function to override default focus behavior
    const preventAutoFocus = () => {
      // This will blur any element that might have received focus during page load
      if (document.activeElement instanceof HTMLElement && 
          document.activeElement !== document.body) {
        logger.info('Removing autofocus from element', document.activeElement);
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
