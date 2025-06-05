import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, CheckCircle, Clock, GitBranch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ClaimsTable from '@/components/claims/ClaimsTable';
import NewClaimModal from '@/components/claims/NewClaimModal';
import { ClaimsProcessFlowChart } from '@/components/claims/ClaimsProcessFlowChart';
import PageHeader from '@/components/layout/PageHeader';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PageTemplate } from '@/components/ui/page-template';
import { ClaimsTutorial } from '@/components/tutorial/tabs/ClaimsTutorial';
import { createTutorialLogger } from '@/lib/tutorial-logger';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ClaimsTableLoadingSkeleton } from '@/components/claims/ClaimsTableSkeleton';

// Create a dedicated logger for the Claims page
const logger = createTutorialLogger('ClaimsPage');

export default function ClaimsPage() {
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();
  
  // Log when the claims page mounts for debugging
  useEffect(() => {
    logger.info('Claims Management page mounted');
    return () => logger.info('Claims Management page unmounting');
  }, []);

  const activeClaims = useQuery<any[]>({
    queryKey: ['/api/claims/active'],
    refetchOnWindowFocus: false,
  });

  const disputedClaims = useQuery<any[]>({
    queryKey: ['/api/claims/disputed'],
    refetchOnWindowFocus: false,
    enabled: activeTab === 'disputed',
  });

  const resolvedClaims = useQuery<any[]>({
    queryKey: ['/api/claims/resolved'],
    refetchOnWindowFocus: false,
    enabled: activeTab === 'resolved',
  });

  const handleCreateClaim = () => {
    setIsNewClaimModalOpen(true);
  };

  const handleClaimCreated = () => {
    setIsNewClaimModalOpen(false);
    toast({
      title: "Claim created successfully",
      description: "The new claim has been added to your active claims.",
      variant: "success",
    });
    activeClaims.refetch();
  };

  // Log when the claims page mounts for debugging purposes
  useEffect(() => {
    logger.info('ClaimsPage: Component mounted');
  }, []);

  return (
    <DashboardLayout>
      {/* Include the ClaimsTutorial component that handles both localStorage cleanup
          and includes the TutorialManager with the correct tabName */}
      <ClaimsTutorial />
      
      <PageTemplate
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        title="Claims Management"
        description="Track and manage your PII data loss claims"
        headerActions={
          <Button onClick={handleCreateClaim}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Claim
          </Button>
        }
      >
        <div className="space-y-6">
          <Tabs
            defaultValue="active"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active" className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Active Claims
              </TabsTrigger>
              <TabsTrigger value="disputed" className="flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Disputed Claims
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Resolved Claims
              </TabsTrigger>
              <TabsTrigger value="process" className="flex items-center">
                <GitBranch className="mr-2 h-4 w-4" />
                Process Flow
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-4">
              {activeClaims.isLoading ? (
                <LoadingSkeleton />
              ) : activeClaims.isError ? (
                <ErrorCard message="Failed to load active claims" />
              ) : (
                <ClaimsTable 
                  claims={activeClaims.data || []} 
                  type="active" 
                  onRefresh={() => activeClaims.refetch()}
                />
              )}
            </TabsContent>

            <TabsContent value="disputed" className="space-y-4 mt-4">
              {disputedClaims.isLoading ? (
                <LoadingSkeleton />
              ) : disputedClaims.isError ? (
                <ErrorCard message="Failed to load disputed claims" />
              ) : (
                <ClaimsTable 
                  claims={disputedClaims.data || []} 
                  type="disputed" 
                  onRefresh={() => disputedClaims.refetch()}
                />
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4 mt-4">
              {resolvedClaims.isLoading ? (
                <LoadingSkeleton />
              ) : resolvedClaims.isError ? (
                <ErrorCard message="Failed to load resolved claims" />
              ) : (
                <ClaimsTable 
                  claims={resolvedClaims.data || []} 
                  type="resolved" 
                  onRefresh={() => resolvedClaims.refetch()}
                />
              )}
            </TabsContent>

            <TabsContent value="process" className="space-y-4 mt-4">
              <ProcessFlowContent />
            </TabsContent>
          </Tabs>

          <NewClaimModal 
            open={isNewClaimModalOpen} 
            onClose={() => setIsNewClaimModalOpen(false)} 
            onClaimCreated={handleClaimCreated}
          />
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}

/**
 * Standardized loading state using Invela skeleton loaders
 * Provides consistent loading experience across all pages
 */
function LoadingSkeleton() {
  return <ClaimsTableLoadingSkeleton />;
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-red-600">{message}</p>
        <p className="text-red-600 mt-2">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </CardContent>
    </Card>
  );
}

function ProcessFlowContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claims Process Flow</CardTitle>
        <CardDescription>Interactive visualization of the PII data loss claims dispute resolution process</CardDescription>
      </CardHeader>
      <CardContent>
        <ClaimsProcessFlowChart />
      </CardContent>
    </Card>
  );
}
