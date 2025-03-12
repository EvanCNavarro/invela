import React, { lazy, Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { Toaster } from 'react-hot-toast';
import { LoadingScreen } from './components/ui/loading-screen';
import './globals.css';

// Lazy loaded components
const LoginPage = lazy(() => import('./pages/login-page'));
const RegisterPage = lazy(() => import('./pages/register-page'));
const RegisterCompletePage = lazy(() => import('./pages/register-complete-page'));
const AcceptInvitationPage = lazy(() => import('./pages/accept-invitation-page'));
const ResetPasswordPage = lazy(() => import('./pages/reset-password-page'));
const ResetPasswordRequestPage = lazy(() => import('./pages/reset-password-request-page'));
const DashboardPage = lazy(() => import('./pages/dashboard-page'));
const TaskCenterPage = lazy(() => import('./pages/task-center-page'));
const PlaygroundPage = lazy(() => import('./pages/playground-page'));
const FilesPage = lazy(() => import('./pages/files-page'));
const FileVaultPage = lazy(() => import('./pages/file-vault-page'));
const NetworkPage = lazy(() => import('./pages/network-page'));
const NetworkCompanyPage = lazy(() => import('./pages/company-profile-page'));
const CompanyDetailsPage = lazy(() => import('./pages/company-profile-page'));
const AdminPanelPage = lazy(() => import('./pages/admin-panel-page'));
const CardQuestionnairePage = lazy(() => import('./pages/card-questionnaire-page'));
const WelcomePage = lazy(() => import('./pages/welcome-page'));
const CompanyOnboardingPage = lazy(() => import('./pages/company-onboarding-page'));
const UserProfile = lazy(() => import('./pages/user-profile-page'));
const NotFoundPage = lazy(() => import('./pages/not-found-page'));
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import RequireAuth from './components/auth/RequireAuth';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { SocketProvider } from './contexts/SocketContext';
import { PlaygroundVisibilityProvider } from './contexts/PlaygroundVisibilityContext';
import { HelpProvider } from './contexts/HelpContext';
import { FileProvider } from './contexts/FileContext';
import { UploadProvider } from './contexts/UploadContext';
import { useEffect } from 'react';
import { Radar } from './components/playground/Radar';
import { init as initSendtryDev } from './lib/sentry';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  useEffect(() => {
    const isProd = import.meta.env.PROD;
    if (isProd) {
      initSendtryDev();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <PlaygroundVisibilityProvider>
              <HelpProvider>
                <FileProvider>
                  <UploadProvider>
                    <div className="min-h-screen bg-background dark:text-white">
                      <Suspense fallback={<LoadingScreen />}>
                        <Switch>
                          <Route path="/login" component={LoginPage} />
                          <Route path="/register" component={RegisterPage} />
                          <Route path="/register-complete" component={RegisterCompletePage} />
                          <Route path="/accept-invitation/:code" component={AcceptInvitationPage} />
                          <Route path="/reset-password" component={ResetPasswordRequestPage} />
                          <Route path="/reset-password/:token" component={ResetPasswordPage} />
                          <Route path="/welcome" component={RequireAuth(WelcomePage)} />
                          <Route path="/company-onboarding" component={RequireAuth(CompanyOnboardingPage)} />
                          <Route path="/playground">
                            <DashboardLayout>
                              <PlaygroundPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/dashboard">
                            <DashboardLayout>
                              <DashboardPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/admin-panel">
                            <DashboardLayout>
                              <AdminPanelPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/task-center/task/card-:companyName/questionnaire">
                            <DashboardLayout>
                              <CardQuestionnairePage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/task-center/task/:taskSlug">
                            <DashboardLayout>
                              <TaskCenterPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/task-center">
                            <DashboardLayout>
                              <TaskCenterPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/file-vault/:fileId?">
                            <DashboardLayout>
                              <FileVaultPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/network/:companySlug">
                            <DashboardLayout>
                              <NetworkCompanyPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/network">
                            <DashboardLayout>
                              <NetworkPage />
                            </DashboardLayout>
                          </Route>
                          <Route path="/profile">
                            <DashboardLayout>
                              <UserProfile />
                            </DashboardLayout>
                          </Route>
                          <Route path="/">
                            <DashboardLayout>
                              <DashboardPage />
                            </DashboardLayout>
                          </Route>
                          <Route component={NotFoundPage} />
                        </Switch>
                      </Suspense>
                      <Radar />
                      <Toaster position="bottom-right" />
                    </div>
                  </UploadProvider>
                </FileProvider>
              </HelpProvider>
            </PlaygroundVisibilityProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;