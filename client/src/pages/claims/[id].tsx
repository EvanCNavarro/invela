import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PageTemplate } from '@/components/ui/page-template';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Clock, CheckCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ClaimDetailsPage() {
  const params = useParams();
  const { id } = params;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const { toast } = useToast();

  // Fetch claim details
  const { data: claim, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/claims/${id}`],
    refetchOnWindowFocus: false,
  });

  const handleRequestInfo = () => {
    toast({
      title: "Information request sent",
      description: "Additional information has been requested for this claim.",
      variant: "success",
    });
  };

  const handleEscalateClaim = () => {
    toast({
      title: "Claim escalated",
      description: "This claim has been escalated for review.",
      variant: "success",
    });
  };

  const handleDownloadReport = () => {
    toast({
      title: "Report download initiated",
      description: "Your claim report is being prepared for download.",
      variant: "success",
    });
  };

  const handleDisputeClaim = () => {
    toast({
      title: "Dispute initiated",
      description: "You have initiated a dispute for this claim.",
      variant: "success",
    });
  };

  // Format date as MMM DD, YYYY
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Format time as h:mm a
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageTemplate
          drawerOpen={drawerOpen}
          onDrawerOpenChange={setDrawerOpen}
          title="Loading Claim..."
          description="Please wait while we load the claim details"
          backButton={{
            label: 'Back to Claims',
            href: '/claims'
          }}
        >
          <LoadingSkeleton />
        </PageTemplate>
      </DashboardLayout>
    );
  }

  if (isError || !claim) {
    return (
      <DashboardLayout>
        <PageTemplate
          drawerOpen={drawerOpen}
          onDrawerOpenChange={setDrawerOpen}
          title="Error Loading Claim"
          description="There was an error loading the claim details"
          backButton={{
            label: 'Back to Claims',
            href: '/claims'
          }}
        >
          <ErrorCard message="Failed to load claim details. Please try again later." />
        </PageTemplate>
      </DashboardLayout>
    );
  }

  const statusBadge = () => {
    switch (claim.status) {
      case 'in_review':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">In Review</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Processing</Badge>;
      case 'pending_info':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending Info</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Under Review</Badge>;
      case 'escalated':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Escalated</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Approved</Badge>;
      case 'partially_approved':
        return <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">Partially Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Denied</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Unknown</Badge>;
    }
  };

  /**
   * Format amount as a flat number without currency symbol
   * Follows the standardized formatting across the application
   */
  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('en-US');
  };

  return (
    <DashboardLayout>
      <PageTemplate
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        title={`PII Data Loss Claim ${claim.claim_id}`}
        description={`Filed on ${formatDate(claim.claim_date)} ${statusBadge()}`}
        backButton={{
          label: 'Back to Claims',
          href: '/claims'
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Claim Information</CardTitle>
                <CardDescription>Basic details about this PII data loss claim</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Bank Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Bank Name</p>
                        <p>{claim.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bank ID</p>
                        <p>{claim.bank_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Account Number</p>
                        <p>{claim.account_number || 'ACCT-48987654'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">FinTech & Policy</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">FinTech</p>
                        <p>{claim.fintech_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Policy Number</p>
                        <p>{claim.policy_number || 'POL-2025-16998'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Claim Amount</p>
                        <p>{formatCurrency(claim.claim_amount || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="audit" className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Audit Logs
                </TabsTrigger>
                <TabsTrigger value="transaction" className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Transaction Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Breach Details</CardTitle>
                    <CardDescription>Detailed information about the PII data breach</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Breach Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Breach Date</p>
                            <p>{claim.breach_date ? formatDate(claim.breach_date) : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Affected Records</p>
                            <p>{claim.affected_records || '0'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Remediation Status</p>
                          <p>In Progress</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Consent Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Consent ID</p>
                            <p className="break-all">{claim.consent_id || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Consent Scope</p>
                            <p>{claim.consent_scope || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Incident Description</h3>
                        <p className="text-sm">
                          {claim.incident_description || 'Unauthorized access to customer PII data was detected in the system. The breach affected approximately 250 customer records containing names, addresses, and partial account information. Initial investigation suggests the breach occurred through an improperly secured API endpoint.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Claim Timeline</CardTitle>
                    <CardDescription>Chronological events related to this claim</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="relative border-l pl-6 pb-6 border-gray-200">
                        <div className="absolute w-3 h-3 -left-1.5 mt-1.5 rounded-full bg-red-500 border-2 border-white"></div>
                        <time className="text-sm font-medium text-muted-foreground">{formatDate(claim.breach_date || claim.claim_date)} {formatTime(claim.breach_date || claim.claim_date)}</time>
                        <h3 className="text-base font-semibold mt-1">Data Breach Occurred</h3>
                        <p className="text-sm text-muted-foreground mt-1">Initial security incident detected on affected systems</p>
                      </div>
                      <div className="relative border-l pl-6 pb-6 border-gray-200">
                        <div className="absolute w-3 h-3 -left-1.5 mt-1.5 rounded-full bg-yellow-500 border-2 border-white"></div>
                        <time className="text-sm font-medium text-muted-foreground">{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</time>
                        <h3 className="text-base font-semibold mt-1">Breach Detected & Reported</h3>
                        <p className="text-sm text-muted-foreground mt-1">Security team identified and reported unauthorized access</p>
                      </div>
                      <div className="relative border-l pl-6 border-gray-200">
                        <div className="absolute w-3 h-3 -left-1.5 mt-1.5 rounded-full bg-blue-500 border-2 border-white"></div>
                        <time className="text-sm font-medium text-muted-foreground">{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</time>
                        <h3 className="text-base font-semibold mt-1">Claim Filed</h3>
                        <p className="text-sm text-muted-foreground mt-1">Official claim submitted through the claims management system</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audit" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>Detailed audit trail for this claim</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm border rounded-md overflow-hidden">
                        <div className="grid grid-cols-4 border-b bg-muted font-medium p-3">
                          <div className="w-[180px] pl-4">Date & Time</div>
                          <div className="w-[120px]">User</div>
                          <div className="w-[150px]">Action</div>
                          <div className="flex-1 pr-4">Details</div>
                        </div>
                        <div className="divide-y">
                          <div className="grid grid-cols-4 p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActiveTab("details")}>
                            <div className="pl-4">{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</div>
                            <div>System</div>
                            <div>Claim Created</div>
                            <div className="pr-4">Initial claim submission</div>
                          </div>
                          <div className="grid grid-cols-4 p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActiveTab("details")}>
                            <div className="pl-4">{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</div>
                            <div>System</div>
                            <div>Status Change</div>
                            <div className="pr-4">Status set to In Review</div>
                          </div>
                          <div className="grid grid-cols-4 p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActiveTab("details")}>
                            <div className="pl-4">{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</div>
                            <div>J. Martinez</div>
                            <div>Document Upload</div>
                            <div className="pr-4">Added incident report documentation</div>
                          </div>
                          <div className="grid grid-cols-4 p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActiveTab("details")}>
                            <div className="pl-4">{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</div>
                            <div>A. Thompson</div>
                            <div>Comment Added</div>
                            <div className="pr-4">Added additional breach details</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transaction" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Logs</CardTitle>
                    <CardDescription>System transaction records for this claim</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm border rounded-md overflow-hidden">
                        <div className="grid grid-cols-4 border-b bg-muted font-medium p-3">
                          <div className="w-[150px] pl-4">Transaction ID</div>
                          <div className="w-[180px]">Date & Time</div>
                          <div className="w-[140px]">Type</div>
                          <div className="flex-1 pr-4">Status</div>
                        </div>
                        <div className="divide-y">
                          <div className="grid grid-cols-4 p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActiveTab("details")}>
                            <div className="pl-4">TRX-1001-{claim.id}</div>
                            <div>{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</div>
                            <div>Claim Creation</div>
                            <div className="pr-4"><Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Success</Badge></div>
                          </div>
                          <div className="grid grid-cols-4 p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActiveTab("details")}>
                            <div className="pl-4">TRX-1002-{claim.id}</div>
                            <div>{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</div>
                            <div>Notification</div>
                            <div className="pr-4"><Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Delivered</Badge></div>
                          </div>
                          <div className="grid grid-cols-4 p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setActiveTab("details")}>
                            <div className="pl-4">TRX-1003-{claim.id}</div>
                            <div>{formatDate(claim.claim_date)} {formatTime(claim.claim_date)}</div>
                            <div>Document Storage</div>
                            <div className="pr-4"><Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Complete</Badge></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bank Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">FB</span>
                  </div>
                  <div>
                    <p className="font-medium">{claim.bank_name}</p>
                    <p className="text-sm text-muted-foreground">financial@{claim.bank_id.toLowerCase()}.com</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p>Jennifer Martinez</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p>(555) 123-4567</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Bank ID</p>
                    <p>{claim.bank_id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fintech Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-bold">PQ</span>
                  </div>
                  <div>
                    <p className="font-medium">{claim.fintech_name}</p>
                    <p className="text-sm text-muted-foreground">support@{claim.fintech_name.toLowerCase().replace(/\s+/g, '')}.com</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p>Alex Thompson</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p>(555) 987-6543</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Policy Number</p>
                    <p>{claim.policy_number || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Claim Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={handleRequestInfo}>
                  Request Additional Information
                </Button>
                <Button className="w-full" variant="outline" onClick={handleEscalateClaim}>
                  Escalate Claim
                </Button>
                <Button className="w-full" variant="outline" onClick={handleDownloadReport}>
                  Download Claim Report
                </Button>
                <Button className="w-full" variant="destructive" onClick={handleDisputeClaim}>
                  Dispute Claim
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Related Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Incident Report</p>
                        <p className="text-xs text-muted-foreground">PDF · 2.3 MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Data Breach Analysis</p>
                        <p className="text-xs text-muted-foreground">XLSX · 1.4 MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-purple-100 rounded flex items-center justify-center">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Customer Notifications</p>
                        <p className="text-xs text-muted-foreground">PDF · 756 KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="w-full h-64" />
        <Skeleton className="w-full h-96" />
      </div>
      <div className="space-y-6">
        <Skeleton className="w-full h-64" />
        <Skeleton className="w-full h-64" />
        <Skeleton className="w-full h-32" />
      </div>
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
