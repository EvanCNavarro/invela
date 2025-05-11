import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { Skeleton } from "@/components/ui/skeleton";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { createTutorialLogger } from '@/lib/tutorial-logger';

// Create a dedicated logger for the Claims page
const logger = createTutorialLogger('ClaimsPage');

export default function ClaimsPage() {
  // DEBUG: Added more logging for tutorial debugging
  console.log('[ClaimsPage] Mounting claims page component');
  
  // Force log to verify if tutorialEnabled state is being set correctly
  React.useEffect(() => {
    console.log('[ClaimsPage] Claims page mounted - checking tutorial status');
    
    // Make a direct API call to check tutorial status
    fetch('/api/user-tab-tutorials/claims/status')
      .then(response => response.json())
      .then(data => {
        console.log('[ClaimsPage] Tutorial status from API:', data);
      })
      .catch(error => {
        console.error('[ClaimsPage] Error fetching tutorial status:', error);
      });
  }, []);
  logger.info('Rendering Claims Page with standard TutorialManager');
  
  return (
    <DashboardLayout>
      {/* Use standard TutorialManager component for consistency */}
      {/* DEBUG: Force tutorial to display for testing */}
      <TutorialManager 
        tabName="claims"
        // Add key to force component recreation
        key="claims-tutorial-1746962397809" 
      />
      
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