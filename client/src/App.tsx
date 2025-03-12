import React from 'react';
import { ReactNode, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { PlaygroundVisibilityProvider } from './components/playground/playground-context';
import { SocketProvider } from './contexts/SocketContext';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { TaskPage } from "./pages/task-page";
import CardTaskPage from "./pages/card-task-page";
import TaskCenterPage from './pages/task-center-page';
import NotFoundPage from './pages/not-found-page'; // Added import


const DashboardPage = lazy(() => import('./pages/dashboard-page'));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      queryFn: async ({ queryKey }) => {
        // First element of queryKey should be the URL
        const url = queryKey[0];
        // Rest of the elements might be params or additional options
        const params = queryKey.length > 1 ? queryKey[1] : undefined;

        if (typeof url !== 'string') {
          throw new Error('Invalid queryKey: first element must be a string URL');
        }

        return await api.get(url, params);
      },
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <SocketProvider>
            <PlaygroundVisibilityProvider>
              <BrowserRouter>
                <Toaster />
                <Routes>
                  <Route path="/" element={<Suspense fallback={<div>Loading...</div>}><DashboardPage /></Suspense>} />
                  <Route path="/task-center" element={<TaskCenterPage />} />
                  <Route path="/task-center/task/card-:slug" element={props => <CardTaskPage params={props.params} />} />
                  <Route path="/task-center/task/:taskSlug" element={<TaskPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </BrowserRouter>
            </PlaygroundVisibilityProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// DashboardPage is now imported from its own file
// Don't define it here to avoid duplication