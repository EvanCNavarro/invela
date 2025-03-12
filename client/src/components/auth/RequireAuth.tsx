
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

// Higher-order component that ensures the user is authenticated
export default function RequireAuth(Component: React.ComponentType) {
  return function AuthenticatedComponent(props: any) {
    const { user, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      );
    }
    
    if (!user) {
      return <Redirect to="/login" />;
    }
    
    return <Component {...props} />;
  };
}
