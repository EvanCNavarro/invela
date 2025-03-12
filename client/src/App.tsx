import React, { ReactNode, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom'; // Added Routes import
import { ThemeProvider } from './components/theme-provider';
import { PlaygroundVisibilityProvider } from './components/playground/playground-context';
import { SocketProvider } from './contexts/SocketContext';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { TaskPage } from "./pages/task-page";
import { DashboardPage } from "./pages/dashboard-page";
import CardTaskPage from "./pages/card-task-page"; // Added import for CardTaskPage

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
                <Routes> {/* Changed to Routes */}
                  <Route path="/" element={<DashboardPage />} /> {/* Assuming DashboardPage is the default route */}
                  <Route path="/task-center/task/card-:slug" element={<CardTaskPage params={{ slug: `card-${params.slug}` }} />} /> {/* Added route for CardTaskPage */}
                  <Route path="/task-center/task/:taskSlug" element={<TaskPage />} /> {/* Updated to use element prop */}
                  {/* Add other routes here */}
                </Routes>
              </BrowserRouter>
            </PlaygroundVisibilityProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}