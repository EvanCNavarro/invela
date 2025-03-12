import React, { ReactNode, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { PlaygroundVisibilityProvider } from './components/playground/playground-context';
import { SocketProvider } from './contexts/SocketContext';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { TaskPage } from "./pages/task-page";
import CardTaskPage from "./pages/card-task-page";

const DashboardPage = lazy(() => import('./pages/dashboard-page'));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, 
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
                  <Route path="/task-center/task/card-:slug" element={<CardTaskPage params={{ slug: `card-${params.slug}` }} />} />
                  <Route path="/task-center/task/:taskSlug" element={<TaskPage />} />
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