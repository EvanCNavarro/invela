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
        <CardTitle>Claims Process Flow</CardTitle>
        <p className="text-sm text-muted-foreground">Visualize the PII data loss claims dispute resolution process</p>
      </CardHeader>
      <CardContent>
        <div className="p-6 bg-slate-50 border rounded-lg relative overflow-auto">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-1">PII Data Loss Claims Process Flow</h3>
          </div>

          {/* Main flow chart container with connecting lines */}
          <div className="relative pb-10 max-w-4xl mx-auto">
            {/* Row 1 - First three boxes with arrows */}
            <div className="flex justify-between items-center relative mb-24">
              {/* First box - PII Data Breach Reported */}
              <div className="relative w-40 z-10">
                <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-center h-32 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">PII Data Breach Reported</h4>
                  <p className="text-xs text-slate-600">Initial incident detection and reporting</p>
                </div>
                {/* Downward arrow for first box */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16 text-slate-400">
                  <svg className="w-8 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Connecting line between first and second box */}
              <div className="flex-grow border-t-2 border-slate-300 border-dashed mx-4 relative top-16"></div>

              {/* Second box - Bank Files Claim */}
              <div className="relative w-40 z-10">
                <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg text-center h-32 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">Bank Files Claim</h4>
                  <p className="text-xs text-slate-600">EOCD Detailed</p>
                </div>
                {/* Downward arrow for second box */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16 text-slate-400">
                  <svg className="w-8 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Connecting line between second and third box */}
              <div className="flex-grow border-t-2 border-slate-300 border-dashed mx-4 relative top-16"></div>

              {/* Third box - FinTech Response */}
              <div className="relative w-40 z-10">
                <div className="p-3 bg-purple-100 border border-purple-200 rounded-lg text-center h-32 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">FinTech Response</h4>
                  <p className="text-xs text-slate-600">Initial assessment and response</p>
                </div>
                {/* Downward arrow for third box */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16 text-slate-400">
                  <svg className="w-8 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Diamond decision node - Disputed? */}
            <div className="flex justify-center items-center mb-24 relative">
              <div className="transform rotate-45 bg-green-100 border border-green-200 w-32 h-32 flex items-center justify-center z-10">
                <div className="transform -rotate-45 text-center">
                  <h4 className="font-medium text-sm mb-2">Disputed?</h4>
                </div>
              </div>

              {/* Yes/No labels and arrows from diamond */}
              <div className="absolute top-full mt-2 left-1/3 text-sm font-medium text-slate-600">Yes</div>
              <div className="absolute top-full mt-2 right-1/3 text-sm font-medium text-slate-600">No</div>

              {/* Left-downward arrow (Yes path) */}
              <div className="absolute top-full left-1/3 mt-6 text-slate-400 transform -translate-x-full">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>

              {/* Right-downward arrow (No path) */}
              <div className="absolute top-full right-1/3 mt-6 text-slate-400 transform translate-x-full">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>

            {/* Row 3 - Dispute Resolution Process and Process Payment */}
            <div className="flex justify-between items-center relative mb-24">
              {/* Dispute Resolution Process box */}
              <div className="ml-16 w-48 z-10">
                <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-lg text-center h-32 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">Dispute Resolution Process</h4>
                  <p className="text-xs text-slate-600">Formal dispute resolution between parties</p>
                </div>
                {/* Arrow pointing to next decision */}
                <div className="absolute right-0 top-1/2 transform translate-x-4 -translate-y-1/2 text-slate-400">
                  <svg className="w-16 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

              {/* Process Payment box */}
              <div className="mr-16 w-48 z-10">
                <div className="p-3 bg-green-100 border border-green-200 rounded-lg text-center h-32 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">Process Payment</h4>
                  <p className="text-xs text-slate-600">Financial settlement and compensation</p>
                </div>
                {/* Downward arrow for payment box */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16 text-slate-400">
                  <svg className="w-8 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Diamond decision node - Who is liable? */}
            <div className="flex justify-center items-center ml-12 mb-24 relative">
              <div className="transform rotate-45 bg-yellow-100 border border-yellow-200 w-32 h-32 flex items-center justify-center z-10">
                <div className="transform -rotate-45 text-center">
                  <h4 className="font-medium text-sm mb-2">Who is liable?</h4>
                </div>
              </div>

              {/* Arrows from liability diamond */}
              <div className="absolute -bottom-16 left-0 text-slate-400">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
              <div className="absolute -bottom-16 text-slate-400">
                <svg className="w-8 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="absolute -bottom-16 right-0 text-slate-400">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>

            {/* Row 4 - Outcome boxes */}
            <div className="flex justify-between items-center relative">
              {/* Bank Liable box */}
              <div className="w-40 z-10">
                <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg text-center h-28 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">Bank Liable</h4>
                </div>
              </div>

              {/* Shared Liability box */}
              <div className="w-40 z-10">
                <div className="p-3 bg-amber-100 border border-amber-200 rounded-lg text-center h-28 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">Shared Liability</h4>
                </div>
              </div>

              {/* FinTech Liable box */}
              <div className="w-40 z-10">
                <div className="p-3 bg-purple-100 border border-purple-200 rounded-lg text-center h-28 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">FinTech Liable</h4>
                </div>
              </div>

              {/* Close claim box */}
              <div className="w-40 z-10">
                <div className="p-3 bg-green-100 border border-green-200 rounded-lg text-center h-28 flex flex-col justify-center">
                  <h4 className="font-medium text-sm mb-1">Close Claim</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Legend for flow chart */}
          <div className="mt-8 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border border-red-200 mr-2"></div>
                <span className="text-xs">Data Breach</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-100 border border-blue-200 mr-2"></div>
                <span className="text-xs">Bank Actions</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-100 border border-purple-200 mr-2"></div>
                <span className="text-xs">FinTech Actions</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 border border-green-200 mr-2"></div>
                <span className="text-xs">Resolution</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
