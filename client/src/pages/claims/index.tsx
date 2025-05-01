import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, CheckCircle, Clock, GitBranch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ClaimsTable from '@/components/claims/ClaimsTable';
import NewClaimModal from '@/components/claims/NewClaimModal';
import PageHeader from '@/components/layout/PageHeader';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PageTemplate } from '@/components/ui/page-template';

export default function ClaimsPage() {
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();

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

  return (
    <DashboardLayout>
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
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
        <CardTitle>PII Data Loss Claims Process</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-slate-50">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mb-3">1</div>
              <h3 className="font-semibold text-lg mb-2">Claim Submission</h3>
              <p className="text-sm text-slate-600">
                A data loss incident is identified and reported through the claims submission process.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-slate-50">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mb-3">2</div>
              <h3 className="font-semibold text-lg mb-2">Initial Review</h3>
              <p className="text-sm text-slate-600">
                Claims are reviewed for completeness and basic eligibility criteria.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-slate-50">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mb-3">3</div>
              <h3 className="font-semibold text-lg mb-2">Investigation</h3>
              <p className="text-sm text-slate-600">
                Detailed analysis of the data breach, including scope and impact assessment.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-slate-50">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mb-3">4</div>
              <h3 className="font-semibold text-lg mb-2">Dispute Resolution</h3>
              <p className="text-sm text-slate-600">
                Parties may dispute claim facts or liability, initiating the resolution process.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-slate-50">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mb-3">5</div>
              <h3 className="font-semibold text-lg mb-2">Decision</h3>
              <p className="text-sm text-slate-600">
                Final determination of the claim outcome, including liability and compensation.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-slate-50">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center mb-3">6</div>
              <h3 className="font-semibold text-lg mb-2">Resolution & Payment</h3>
              <p className="text-sm text-slate-600">
                Approved claims are processed for payment and case closure.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
