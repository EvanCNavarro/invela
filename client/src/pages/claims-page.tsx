import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { Skeleton } from "@/components/ui/skeleton";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Bug } from "lucide-react";
import { createTutorialLogger } from '@/lib/tutorial-logger';
import tutorialDebug from '@/lib/tutorial-debug';
import { useTabTutorials } from '@/hooks/use-tab-tutorials';
import { useTutorialWebSocket } from '@/hooks/use-tutorial-websocket';
import { Button } from "@/components/ui/button";

// Create a dedicated logger for the Claims page
const logger = createTutorialLogger('ClaimsPage');

// Debug component to display tutorial status
function TutorialDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Directly call API to get status
  useEffect(() => {
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
      
    // Get database entry directly
    fetch('/api/user-tab-tutorials/claims')
      .then(response => response.json())
      .then(data => {
        setDbStatus(data);
      })
      .catch(error => {
        console.error('Error fetching DB entry:', error);
      });
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
        Debug
      </Button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-black bg-opacity-95 p-4 rounded-lg border border-red-500 z-50 text-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-red-400">Tutorial Debug</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>×</Button>
      </div>
      
      <div className="space-y-4 text-xs overflow-y-auto max-h-80">
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
        
        <div>
          <h4 className="font-bold border-b border-gray-700 pb-1 mb-2">Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => tutorialDebug.showConsole()}
              className="text-xs h-8"
            >
              Show Console
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
              onClick={() => fetch('/api/user-tab-tutorials/claims/reset', { method: 'POST' })}
              className="text-xs h-8"
            >
              Reset Tutorial
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                localStorage.setItem('FORCE_CLAIMS_TUTORIAL', 'true');
                window.location.reload();
              }}
              className="text-xs h-8"
            >
              Force Enable
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom debug-enabled tutorial manager
function DebugTutorialManager({ tabName }: { tabName: string }) {
  // Create a wrapper to access and debug the hook
  const hookResult = useTabTutorials(tabName);
  const wsResult = useTutorialWebSocket(tabName);
  
  // Log the hook state
  useEffect(() => {
    tutorialDebug.hooks.init('useTabTutorials', hookResult);
    tutorialDebug.hooks.init('useTutorialWebSocket', wsResult);
    
    logger.debug('Tutorial hook state:', {
      tutorialEnabled: hookResult.tutorialEnabled,
      isLoading: hookResult.isLoading, 
      isCompleted: hookResult.isCompleted,
      currentStep: hookResult.currentStep,
      totalSteps: hookResult.totalSteps,
      wsProgress: wsResult.tutorialProgress
    });
  }, [
    hookResult.tutorialEnabled, 
    hookResult.isLoading,
    hookResult.isCompleted,
    hookResult.currentStep,
    wsResult.tutorialProgress
  ]);
  
  // Force tutorial if requested
  const forceTutorial = localStorage.getItem('FORCE_CLAIMS_TUTORIAL') === 'true';
  
  return (
    <>
      {/* Debug message if forced */}
      {forceTutorial && (
        <div className="bg-red-500 text-white p-2 text-sm fixed top-0 left-0 right-0 z-50 text-center">
          Tutorial forced via localStorage. <button onClick={() => {
            localStorage.removeItem('FORCE_CLAIMS_TUTORIAL');
            window.location.reload();
          }} className="underline">Disable</button>
        </div>
      )}
      
      {/* Standard tutorial manager with extra props */}
      <TutorialManager 
        tabName={tabName}
        key={`claims-tutorial-${Date.now()}`} 
        {...(forceTutorial ? { _debugForceEnabled: true } : {})}
      />
    </>
  );
}

export default function ClaimsPage() {
  // Track mount time for debugging
  const mountTime = React.useRef(new Date().toISOString());
  
  // Initialize tutorial debugging
  useEffect(() => {
    // Track page navigation
    tutorialDebug.navigation.navigate('unknown', 'claims');
    
    // Log component lifecycle
    tutorialDebug.lifecycle.mount('ClaimsPage', { mountTime: mountTime.current });
    
    // Log beginning of direct API check
    tutorialDebug.api.log('/api/user-tab-tutorials/claims/status', 'GET', null, null);
    
    // Make a direct API call to check tutorial status
    fetch('/api/user-tab-tutorials/claims/status')
      .then(response => response.json())
      .then(data => {
        // Log successful API response
        tutorialDebug.api.log('/api/user-tab-tutorials/claims/status', 'GET', null, data);
        logger.info('Tutorial status from API:', data);
      })
      .catch(error => {
        // Log API error
        tutorialDebug.api.error('/api/user-tab-tutorials/claims/status', 'GET', error);
        logger.error('Error fetching tutorial status:', error);
      });
    
    // Also make a direct call to get the full entry
    fetch('/api/user-tab-tutorials/claims')
      .then(response => response.json())
      .then(data => {
        tutorialDebug.api.log('/api/user-tab-tutorials/claims', 'GET', null, data);
        logger.info('Full tutorial entry:', data);
      })
      .catch(error => {
        tutorialDebug.api.error('/api/user-tab-tutorials/claims', 'GET', error);
        logger.error('Error fetching full tutorial entry:', error);
      });
    
    // Clean up on unmount
    return () => {
      tutorialDebug.lifecycle.unmount('ClaimsPage');
    };
  }, []);
  
  // Log render start
  tutorialDebug.render.start('ClaimsPage', { time: new Date().toISOString() });
  logger.info('Rendering Claims Page with Debug-Enabled TutorialManager');
  
  return (
    <DashboardLayout>
      {/* Debug panel */}
      <TutorialDebugPanel />
      
      {/* Debug-enhanced tutorial manager */}
      <DebugTutorialManager tabName="claims" />
      
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