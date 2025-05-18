import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Redirect, Route } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: (...args: any[]) => React.JSX.Element;
}) {
  const { user, isLoading, error } = useAuth();

  // Log authentication issues for debugging
  useEffect(() => {
    if (error) {
      console.error('[ProtectedRoute] Authentication error:', error.message);
    }
  }, [error]);

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
    // Redirect to auth page if not authenticated
    console.log('[ProtectedRoute] User not authenticated, redirecting to /auth');
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}