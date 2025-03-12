
import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/components/ui/use-toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/hooks/use-auth';

export default function RegisterCompletePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (user) {
      toast({
        title: "Registration completed",
        description: "Your account has been set up successfully.",
        variant: "default",
        className: "border-l-4 border-green-500",
      });
      setLocation('/task-center');
    }
  }, [user, setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 rounded-lg border shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Completing registration...</h1>
          <p className="text-muted-foreground mt-2">Please wait while we finish setting up your account.</p>
        </div>
        <LoadingScreen message="Setting up your account..." />
      </div>
    </div>
  );
}
