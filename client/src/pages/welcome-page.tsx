
import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function WelcomePage() {
  const [, navigate] = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to DStreet</CardTitle>
          <CardDescription>
            Your platform for financial data management and company insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            You've successfully logged in. Let's get you started with your tasks and company management.
          </p>
          
          <div className="my-6 grid gap-6">
            <div className="rounded-md border p-4">
              <h3 className="mb-2 font-medium">Task Center</h3>
              <p className="text-sm text-muted-foreground">
                View and manage your assigned tasks
              </p>
            </div>
            
            <div className="rounded-md border p-4">
              <h3 className="mb-2 font-medium">File Vault</h3>
              <p className="text-sm text-muted-foreground">
                Securely store and access your company files
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button 
            onClick={() => navigate('/task-center')}
            className="w-full"
          >
            Go to Task Center
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
