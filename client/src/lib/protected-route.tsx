/**
 * ========================================
 * Protected Route Component
 * ========================================
 * 
 * A higher-order component that wraps routes requiring authentication.
 * Displays loading spinner while checking auth status, redirects to login
 * if user is not authenticated, or renders the protected component.
 * 
 * @module ProtectedRoute
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Redirect, Route } from "wouter";

/**
 * ProtectedRoute component that requires authentication
 * 
 * @param path - The route path to protect
 * @param component - The component to render when authenticated
 * @returns JSX element with authentication protection
 */
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: (...args: any[]) => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="md" className="text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}