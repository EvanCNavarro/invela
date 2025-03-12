import React, { ReactNode, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider, ReactQueryDevtools } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { PlaygroundVisibilityProvider } from './components/playground/playground-context';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes';

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
        <ThemeProvider defaultTheme="light" storageKey="dstreet-theme">
          <SocketProvider>
            <PlaygroundVisibilityProvider>
              <BrowserRouter>
                <Toaster />
                <AppRoutes />
              </BrowserRouter>
            </PlaygroundVisibilityProvider>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}