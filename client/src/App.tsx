
import React from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './lib/protected-route';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/login-page';
import RegisterPage from './pages/register-page';
import TaskCenterPage from './pages/task-center-page';
import TaskPage from './pages/task-page';
import CompanyKYBFormPage from './pages/kyb-task-page';
import FileVaultPage from './pages/file-vault-page';
import NetworkPage from './pages/network-page';
import NetworkCompanyPage from './pages/company-profile-page';
import CompanyDetailsPage from './pages/user-profile-page'; // Changed from profile-page to user-profile-page
import AdminPanelPage from './pages/admin-panel-page';
import CardQuestionnairePage from './pages/card-questionnaire-page';
import WelcomePage from './pages/welcome-page';
import CompanyOnboardingPage from './pages/company-onboarding-page';
import UserProfile from './pages/user-profile-page';
import NotFoundPage from './pages/not-found-page';
import { AuthProvider } from './contexts/AuthContext';

// Setup React Query
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-center" />
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <ProtectedRoute path="/" exact>
            <DashboardLayout>
              <TaskCenterPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/playground/:componentId?">
            <DashboardLayout>
              <div>Playground</div>
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/task-center">
            <DashboardLayout>
              <TaskCenterPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/task-center/task/:taskSlug/:subpage?">
            <DashboardLayout>
              <TaskPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/file-vault">
            <DashboardLayout>
              <FileVaultPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/network">
            <DashboardLayout>
              <NetworkPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/network/company/:companyId">
            <DashboardLayout>
              <NetworkCompanyPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/company/:companyId">
            <DashboardLayout>
              <CompanyDetailsPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/admin">
            <DashboardLayout>
              <AdminPanelPage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/card-questionnaire">
            <DashboardLayout>
              <CardQuestionnairePage />
            </DashboardLayout>
          </ProtectedRoute>
          <ProtectedRoute path="/welcome">
            <WelcomePage />
          </ProtectedRoute>
          <ProtectedRoute path="/onboarding">
            <CompanyOnboardingPage />
          </ProtectedRoute>
          <ProtectedRoute path="/profile">
            <DashboardLayout>
              <UserProfile />
            </DashboardLayout>
          </ProtectedRoute>
          <Route component={NotFoundPage} />
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
