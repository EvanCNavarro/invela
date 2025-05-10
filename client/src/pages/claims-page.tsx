import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-template";
import { Skeleton } from "@/components/ui/skeleton";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { TabTutorialModal } from '@/components/tutorial/TabTutorialModal';
import { ClaimsTutorial } from '@/components/tutorial/tabs/ClaimsTutorial';

// Simplified tutorial manager for claims page
function ClaimsTutorialManager() {
  // Force tutorial to display initially to ensure it works correctly
  const [forceDisplay, setForceDisplay] = useState<boolean>(true);
  
  useEffect(() => {
    console.log('[ClaimsTutorialManager] Setting up claims tutorial with forced display');
    
    // Log that we attempted to force display the tutorial
    return () => {
      console.log('[ClaimsTutorialManager] Claims tutorial component unmounted');
    };
  }, []);
  
  // Import and use our specialized claims tutorial component
  return (
    <>
      <TutorialManager tabName="claims" />
      {forceDisplay && (
        <ClaimsTutorial forceTutorial={true} />
      )}
    </>
  );
}

export default function ClaimsPage() {
  return (
    <DashboardLayout>
      {/* Enhanced claims tutorial manager with debug logging */}
      <ClaimsTutorialManager />
      
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