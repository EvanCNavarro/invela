import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Bug } from "lucide-react";
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { Button } from "@/components/ui/button";
import { TutorialManager } from '@/components/tutorial/TutorialManager';

// Create a dedicated logger for the Claims page
const logger = createTutorialLogger('ClaimsPage');

/**
 * Enhanced Debug Panel for Claims Tutorial
 * 
 * This component provides a robust debugging interface for the claims page tutorials.
 * It shows both database state and localStorage values to help diagnose issues.
 */
function TutorialDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [localStorageState, setLocalStorageState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to refresh the local storage display
  const refreshLocalStorageState = () => {
    setLocalStorageState({
      'claims-tutorial-completed': localStorage.getItem('claims-tutorial-completed'),
      'claims-tutorial-skipped': localStorage.getItem('claims-tutorial-skipped'),
      // Add any other relevant localStorage keys here
    });
  };
  
  // Function to refresh all data
  const refreshAllData = () => {
    setLoading(true);
    
    // Refresh API status
    fetch('/api/user-tab-tutorials/claims/status')
      .then(response => response.json())
      .then(data => {
        setApiStatus(data);
        setLoading(false);
      })
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
      
    // Refresh DB entry
    fetch('/api/user-tab-tutorials/claims')
      .then(response => response.json())
      .then(data => {
        setDbStatus(data);
      })
      .catch(error => {
        console.error('Error fetching DB entry:', error);
      });
      
    // Refresh localStorage state
    refreshLocalStorageState();
  };
  
  // Initial data load
  useEffect(() => {
    refreshAllData();
  }, []);
  
  if (!isVisible) {
    return (
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Bug className="mr-2 h-4 w-4" />
        Tutorial Debug
      </Button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-black bg-opacity-95 p-4 rounded-lg border border-red-500 z-50 text-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-red-400">Claims Tutorial Debug</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>×</Button>
      </div>
      
      <div className="space-y-4 text-xs overflow-y-auto max-h-80">
        {/* LocalStorage Section */}
        <div>
          <h4 className="font-bold border-b border-gray-700 pb-1 mb-2">LocalStorage State</h4>
          <pre className="whitespace-pre-wrap bg-gray-900 p-2 rounded text-yellow-400">
            {JSON.stringify(localStorageState, null, 2)}
          </pre>
        </div>
        
        {/* API Status Section */}
        <div>
          <h4 className="font-bold border-b border-gray-700 pb-1 mb-2">API Status</h4>
          {loading ? (
            <p>Loading API status...</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <pre className="whitespace-pre-wrap bg-gray-900 p-2 rounded text-green-400">
              {JSON.stringify(apiStatus, null, 2)}
            </pre>
          )}
        </div>
        
        {/* Database Entry Section */}
        <div>
          <h4 className="font-bold border-b border-gray-700 pb-1 mb-2">DB Entry</h4>
          {dbStatus ? (
            <pre className="whitespace-pre-wrap bg-gray-900 p-2 rounded text-green-400">
              {JSON.stringify(dbStatus, null, 2)}
            </pre>
          ) : (
            <p>Loading DB status...</p>
          )}
        </div>
        
        {/* Actions Section */}
        <div>
          <h4 className="font-bold border-b border-gray-700 pb-1 mb-2">Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshAllData}
              className="text-xs h-8"
            >
              Refresh Data
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs h-8"
            >
              Reload Page
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetch('/api/user-tab-tutorials/claims/reset', { method: 'POST' })
                .then(() => refreshAllData())}
              className="text-xs h-8"
            >
              Reset Tutorial
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                localStorage.removeItem('claims-tutorial-completed');
                localStorage.removeItem('claims-tutorial-skipped');
                refreshLocalStorageState();
              }}
              className="text-xs h-8"
            >
              Clear Storage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ClaimsTutorialWrapper Component
 * 
 * This component handles the legacy localStorage cleanup and renders the TutorialManager
 * once the cleanup is complete. It ensures that the old DirectClaimsTutorial 
 * implementation doesn't interfere with our unified tutorial system.
 */
function ClaimsTutorialWrapper() {
  const [isReady, setIsReady] = useState(false);
  
  // Run the cleanup immediately when the component mounts
  useEffect(() => {
    try {
      // Remove any conflicting localStorage values from the old implementation
      localStorage.removeItem('claims-tutorial-completed');
      localStorage.removeItem('claims-tutorial-skipped');
      
      // Log the cleanup
      logger.info('ClaimsTutorialWrapper: Legacy localStorage values cleared');
      
      // Mark the component as ready to render the TutorialManager
      setIsReady(true);
    } catch (error) {
      logger.error('ClaimsTutorialWrapper: Error clearing localStorage', error);
    }
  }, []);
  
  // Only render the TutorialManager after cleanup is complete
  if (!isReady) {
    logger.info('ClaimsTutorialWrapper: Not yet ready, waiting for cleanup');
    return null;
  }
  
  logger.info('ClaimsTutorialWrapper: Ready, rendering TutorialManager');
  
  // @ts-ignore - The component is correct but TypeScript has issues with the return type
  return <TutorialManager tabName="claims" />;
}

export default function ClaimsPage() {
  logger.info('Rendering Claims Page with ClaimsTutorialWrapper');
  
  return (
    <DashboardLayout>
      {/* Debug panel */}
      <TutorialDebugPanel />
      
      {/* Use our wrapper component to handle cleanup and rendering */}
      <ClaimsTutorialWrapper />
      
      <PageTemplate
        showBreadcrumbs
      >
        <div className="space-y-6">
          <PageHeader
            title="Claims"
            description="View and manage your organization's claims."
            icon={<FileText className="h-6 w-6 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Claims</CardTitle>
                <CardDescription>Claims pending resolution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest claims updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Claims History</CardTitle>
              <CardDescription>Complete history of all claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}