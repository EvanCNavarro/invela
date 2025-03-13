import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/components/ui/use-toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/hooks/use-auth';

export default function AcceptInvitationPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processInvitation = async () => {
      try {
        // Get the invitation code from URL parameters
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          setError('No invitation code found in URL');
          setIsProcessing(false);
          return;
        }

        // If user is already logged in, redirect to dashboard
        if (user) {
          toast({
            title: "Invitation accepted",
            description: "You're already logged in. Redirecting to dashboard.",
            variant: "default",
          });
          setLocation('/task-center');
          return;
        }

        // Redirect to the register page with the invitation code
        setLocation(`/register?code=${code}`);
      } catch (err) {
        console.error('Error processing invitation:', err);
        setError('Failed to process invitation. Please try again or contact support.');
        setIsProcessing(false);
      }
    };

    processInvitation();
  }, [user, setLocation, toast]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6 rounded-lg border shadow-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Invitation Error</h1>
            <p className="text-muted-foreground mt-2">{error}</p>
            <button 
              onClick={() => setLocation('/login')}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 rounded-lg border shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Processing Invitation</h1>
          <p className="text-muted-foreground mt-2">Please wait while we process your invitation...</p>
        </div>
        <LoadingScreen message="Processing invitation..." />
      </div>
    </div>
  );
}