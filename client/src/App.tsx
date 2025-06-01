/**
 * ========================================
 * Main Application Entry Point
 * ========================================
 * 
 * The primary React application component that orchestrates all core functionality
 * including routing, authentication, WebSocket connections, and service initialization.
 * This component serves as the foundation for the entire enterprise risk assessment platform.
 * 
 * Key Features:
 * - Centralized routing configuration with protected routes
 * - Service initialization and dependency injection
 * - WebSocket connection management for real-time updates
 * - Authentication state management and context provision
 * - Toast notification system integration
 * - Responsive layout management with dashboard wrapper
 * 
 * Dependencies:
 * - React Router (wouter): Client-side routing and navigation
 * - TanStack Query: Data fetching and state management
 * - WebSocket Provider: Real-time communication infrastructure
 * - Authentication System: User session and permission management
 * 
 * @module App
 * @version 1.0.0
 * @since 2025-05-23
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality
import React, { useEffect, Suspense, useState } from "react";

// Routing and navigation
import { Switch, Route, Redirect } from "wouter";
import { useLocation } from "wouter";

// Data management and state
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Authentication and security
import { AuthProvider } from "@/hooks/use-auth";

// UI components and notifications
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import ScrollToTop from "@/components/ScrollToTop";

// Layout and structure
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { OnboardingWrapper } from "@/components/OnboardingWrapper";

// Real-time communication
import { WebSocketProvider } from "@/providers/websocket-provider";

// Service initialization and management
import { initializeServices } from "./services/unified-service-registration";
import { phaseStartup, StartupPhase } from "./utils/phased-startup";
import getLogger from "./utils/standardized-logger";

// Legacy service registration (scheduled for removal in future versions)
import { registerServices } from "./services/registerServices";
import { registerStandardizedServices, useStandardizedServices } from "./services/register-standardized-services";

// ========================================
// PAGE COMPONENTS
// ========================================

// Authentication and user management pages
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import DemoPage from "@/pages/demo-page";

// Core dashboard and navigation pages
import DashboardPage from "@/pages/dashboard-page";
import NetworkPage from "@/pages/network-page";
import TaskCenterPage from "@/pages/task-center-page";
import InsightsPage from "@/pages/insights-page";

// Company and profile management pages
import SimpleCompanyProfile from "@/pages/simple-company-profile";
import FileVault from "@/pages/FileVault";

// Task and form workflow pages
import TaskPage from "@/pages/task-page";
import KY3PTaskPage from "@/pages/ky3p-task-page";
import OpenBankingTaskPage from "@/pages/open-banking-task-page";
import FormSubmissionWorkflowPage from "@/pages/form-submission-workflow";

// Risk assessment and claims pages
import RiskScorePage from "@/pages/risk-score-page";
import ClaimsRiskPage from "@/pages/claims-risk-page";

// Diagnostic and utility pages
import DiagnosticPage from "@/pages/diagnostic-page";
import NotFound from "@/pages/not-found";
// Development and testing utility pages
import TaskFix from "@/pages/TaskFix";
import WebSocketDemoPage from "@/pages/websocket-demo-page";
import { ComponentLibrary } from "@/pages/component-library";

// Route protection utilities
import { ProtectedRoute } from "./lib/protected-route";

// Landing page components (public-facing marketing pages)
import LandingPage from "@/pages/landing";

// Company information pages
import AboutPage from "@/pages/landing/company/about";
import ContactUsPage from "@/pages/landing/company/contact-us";

// Product showcase pages
import AccreditationPage from "@/pages/landing/products/accreditation";
import RiskScoreLandingPage from "@/pages/landing/products/risk-score";
import InvelaRegistryPage from "@/pages/landing/products/invela-registry";
import DataAccessGrantsServicePage from "@/pages/landing/products/data-access-grants-service";
import LiabilityInsurancePage from "@/pages/landing/products/liability-insurance";
import DisputeResolutionPage from "@/pages/landing/products/dispute-resolution";
import InsightsConsultingPage from "@/pages/landing/products/insights-consulting";

// Legal and compliance pages
import PrivacyPolicyPage from "@/pages/landing/legal/privacy-policy";
import TermsOfUsePage from "@/pages/landing/legal/terms-of-use";
import CompliancePage from "@/pages/landing/legal/compliance";
import LegalPage from "@/pages/landing/legal";

// Site navigation and miscellaneous pages
import SiteMapPage from "@/pages/landing/site-map";
import RiskScoreConfigurationPage from "@/pages/risk-score-configuration-page";

// Developer tools and documentation
// Removed Storybook - using custom component library

// Claims management pages
import ClaimsPage from "@/pages/claims";
import ClaimDetailsPage from "@/pages/claims/[id]";



// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Props interface for the ProtectedLayout component
 * Ensures proper typing for protected route wrapper
 */
interface ProtectedLayoutProps {
  children: React.ReactNode;
}

// ========================================
// COMPONENT IMPLEMENTATIONS
// ========================================

/**
 * Protected Layout Component
 * 
 * Provides a secure wrapper for authenticated routes with consistent
 * styling and minimum height constraints. This component ensures that
 * protected content is displayed within a standardized layout structure.
 * 
 * @param props - Component props containing children elements
 * @returns JSX element with protected layout structure
 */
function ProtectedLayout({ children }: ProtectedLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

/**
 * Router Component
 * 
 * Central routing configuration for the entire application. This component
 * manages all navigation paths including public landing pages, authenticated
 * dashboard routes, and specialized workflow pages. The router implements
 * both public and protected route patterns with appropriate access controls.
 * 
 * Route Categories:
 * - Landing Pages: Public marketing and informational content
 * - Authentication: Login, registration, and user management
 * - Dashboard: Protected application functionality
 * - Task Management: Form workflows and data collection
 * - Risk Assessment: Analysis and scoring features
 * - Claims Management: Insurance and dispute handling
 * 
 * @returns JSX element containing the complete routing configuration
 */
function Router(): JSX.Element {
  const [location] = useLocation();
  
  // Development logging for route debugging (can be removed in production)
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

        {/* Developer Tools */}
        {/* Component Library - Custom React-based documentation */}
        <Route path="/component-library">
          <ComponentLibrary />
        </Route>

        {/* Public routes */}
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/demo" component={DemoPage} />
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

        <ProtectedRoute 
          path="/network/company/:companyId" 
          component={({ params }: { params: { companyId: string } }) => {
            console.log('[Router] Rendering company profile page for ID:', params.companyId);
            return (
              <ProtectedLayout>
                <OnboardingWrapper>
                  <SimpleCompanyProfile />
                </OnboardingWrapper>
              </ProtectedLayout>
            );
          }} 
        />

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
          component={({ params }: { params: { claimId: string } }) => {
            console.log('[Router] Rendering claim details page for ID:', params.claimId);
            return (
              <ProtectedLayout>
                <OnboardingWrapper>
                  <ClaimDetailsPage />
                </OnboardingWrapper>
              </ProtectedLayout>
            );
          }} 
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

        {/* WebSocket Demo Page */}
        <Route path="/websocket-demo">
          <ProtectedLayout>
            <WebSocketDemoPage />
          </ProtectedLayout>
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

        {/* Task Fix utility page for fixing task status/progress issues */}
        <ProtectedRoute 
          path="/task-fix" 
          component={() => (
            <ProtectedLayout>
              <DashboardLayout>
                <OnboardingWrapper>
                  <TaskFix />
                </OnboardingWrapper>
              </DashboardLayout>
            </ProtectedLayout>
          )} 
        />

        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

// ========================================
// MAIN APPLICATION COMPONENT
// ========================================

// Initialize standardized logger for application-level events
const logger = getLogger('App');

/**
 * Main Application Component
 * 
 * The root component that orchestrates the entire enterprise risk assessment platform.
 * This component implements a phased startup approach using OODA loop principles
 * to ensure reliable initialization of all system components and dependencies.
 * 
 * Initialization Phases:
 * 1. Framework: React core and fundamental providers
 * 2. Context: User authentication and company context
 * 3. Services: Business logic and form services
 * 4. Features: Advanced features and integrations
 * 
 * The component provides comprehensive error handling, logging, and real-time
 * communication capabilities through WebSocket integration.
 * 
 * @returns JSX element containing the complete application structure
 */
export default function App(): JSX.Element {
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
