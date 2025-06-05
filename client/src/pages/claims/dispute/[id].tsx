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
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  File,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ClaimDisputePage() {
  const params = useParams();
  const { id } = params;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const { toast } = useToast();
  const [selectedLiability, setSelectedLiability] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch dispute details
  const { data: dispute, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/claims/dispute/${id}`],
    refetchOnWindowFocus: false,
  });

  const handleSaveDraft = () => {
    toast({
      title: "Draft saved",
      description: "Your resolution draft has been saved.",
      variant: "success",
    });
  };

  const handleSubmitResolution = () => {
    if (!selectedLiability) {
      toast({
        title: "Error",
        description: "Please select a liability determination before submitting.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Resolution submitted",
      description: "Your resolution decision has been submitted successfully.",
      variant: "success",
    });
  };

  /**
   * Format date as MMM DD, YYYY
   * Standardized date formatting for consistent display
   */
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  /**
   * Format amount as a flat number without currency symbol
   * Follows the standardized formatting across the application
   */
  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('en-US');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageTemplate
          drawerOpen={drawerOpen}
          onDrawerOpenChange={setDrawerOpen}
          title="Loading Dispute..."
          description="Please wait while we load the dispute details"
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

  if (isError || !dispute) {
    return (
      <DashboardLayout>
        <PageTemplate
          drawerOpen={drawerOpen}
          onDrawerOpenChange={setDrawerOpen}
          title="Error Loading Dispute"
          description="There was an error loading the dispute details"
          backButton={{
            label: 'Back to Claims',
            href: '/claims'
          }}
        >
          <ErrorCard message="Failed to load dispute details. Please try again later." />
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Using formatCurrency from above - standardized across all pages

  // Mock data structured from the screenshot
  const disputeData = {
    id: id,
    claim_id: `CLM-2025-${id.padStart(3, '0')}`,
    status: "under_review",
    bank: {
      name: dispute.bank_name || "Metro Credit Union",
      id: dispute.bank_id || "BNK-67890",
      contact: "Sarah Williams",
      phone: "(555) 234-5678",
      email: "contact@metrocreditunion.com"
    },
    fintech: {
      name: dispute.fintech_name || "LendSecure Technologies",
      contact: "Michael Chen",
      phone: "(555) 876-5432",
      email: "support@lendsecure.tech"
    },
    policy: {
      type: "Data Breach Insurance",
      number: "POL-2025-45678",
      coverage_period: "Jan 1, 2025 - Dec 31, 2025",
      coverage_amount: 100000,
      deductible: 500
    },
    dispute_reason: "The bank disputes liability for the PII data loss, claiming the Fintech's security measures were inadequate and violated contractual obligations.",
    original_claim: {
      type: "PII Data Loss",
      amount: dispute.claim_amount || 50.00,
      date: dispute.claim_date || new Date().toISOString(),
    }
  };

  return (
    <DashboardLayout>
      <PageTemplate
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        title={`PII Data Loss Claim Dispute #${disputeData.claim_id}`}
        description={`Filed on ${formatDate(disputeData.original_claim.date)} · `}
        backButton={{
          label: 'Back to Claims',
          href: '/claims'
        }}
      >
        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 ml-2">Under Review</Badge>

        <div className="mt-6">
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center">
                <File className="mr-2 h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dispute Details</CardTitle>
                  <CardDescription>Review the PII data loss claim dispute information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold mb-2">Dispute Reason</h3>
                      <p className="text-sm">{disputeData.dispute_reason}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-semibold mb-3">Original Claim Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Claim Type</p>
                          <p>{disputeData.original_claim.type}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Claim Amount</p>
                          <p>{formatCurrency(disputeData.original_claim.amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Bank</p>
                          <p>{disputeData.bank.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Fintech</p>
                          <p>{disputeData.fintech.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Policy Number</p>
                          <p>{disputeData.policy.number}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date of Loss</p>
                          <p>{formatDate(disputeData.original_claim.date)}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold mb-3">Resolution Decision</h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-sm font-medium mb-3">Determine the outcome of this PII data loss dispute</p>
                        
                        <RadioGroup value={selectedLiability || ''} onValueChange={setSelectedLiability} className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <RadioGroupItem value="bank" id="bank" className="mt-1" />
                            <div className="grid gap-1.5">
                              <Label htmlFor="bank" className="font-medium">Bank Liability</Label>
                              <p className="text-sm text-muted-foreground">Determine the bank is liable for the PII data loss</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <RadioGroupItem value="fintech" id="fintech" className="mt-1" />
                            <div className="grid gap-1.5">
                              <Label htmlFor="fintech" className="font-medium">Fintech Liability</Label>
                              <p className="text-sm text-muted-foreground">Determine the fintech is liable for the PII data loss</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <RadioGroupItem value="shared" id="shared" className="mt-1" />
                            <div className="grid gap-1.5">
                              <Label htmlFor="shared" className="font-medium">Shared Liability</Label>
                              <p className="text-sm text-muted-foreground">Determine both parties share liability for the PII data loss</p>
                            </div>
                          </div>
                        </RadioGroup>
                        
                        <div className="mt-4">
                          <Label htmlFor="notes" className="font-medium">Resolution Notes</Label>
                          <Textarea 
                            id="notes" 
                            placeholder="Enter detailed notes about your decision regarding the PII data loss liability..."
                            className="mt-1.5 min-h-[120px]"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Supporting documentation for this dispute</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted font-medium p-3 pl-4 border-b">Bank Documentation</div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => {}}>
                          <div className="flex items-center space-x-3 pl-1">
                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Security Audit Report</p>
                              <p className="text-xs text-muted-foreground">PDF · 1.2 MB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="mr-1" onClick={(e) => e.stopPropagation()}>View</Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => {}}>
                          <div className="flex items-center space-x-3 pl-1">
                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Data Access Logs</p>
                              <p className="text-xs text-muted-foreground">XLSX · 845 KB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="mr-1" onClick={(e) => e.stopPropagation()}>View</Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => {}}>
                          <div className="flex items-center space-x-3 pl-1">
                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Service Agreement</p>
                              <p className="text-xs text-muted-foreground">PDF · 2.8 MB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="mr-1" onClick={(e) => e.stopPropagation()}>View</Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted font-medium p-3 pl-4 border-b">Fintech Documentation</div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => {}}>
                          <div className="flex items-center space-x-3 pl-1">
                            <div className="h-8 w-8 bg-purple-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Security Compliance Report</p>
                              <p className="text-xs text-muted-foreground">PDF · 3.1 MB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="mr-1" onClick={(e) => e.stopPropagation()}>View</Button>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => {}}>
                          <div className="flex items-center space-x-3 pl-1">
                            <div className="h-8 w-8 bg-purple-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Incident Response Timeline</p>
                              <p className="text-xs text-muted-foreground">DOCX · 520 KB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="mr-1" onClick={(e) => e.stopPropagation()}>View</Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted font-medium p-3 pl-4 border-b">Third-Party Analysis</div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => {}}>
                          <div className="flex items-center space-x-3 pl-1">
                            <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Forensic Analysis Report</p>
                              <p className="text-xs text-muted-foreground">PDF · 5.7 MB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="mr-1" onClick={(e) => e.stopPropagation()}>View</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dispute History</CardTitle>
                  <CardDescription>Timeline of events related to this dispute</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l pl-6 space-y-6 border-gray-200">
                    <div className="mb-10">
                      <div className="absolute w-3 h-3 -left-1.5 mt-1.5 rounded-full bg-blue-500 border-2 border-white"></div>
                      <time className="text-sm font-medium text-gray-400 mb-1 block">{formatDate(disputeData.original_claim.date)} 09:45 AM</time>
                      <h3 className="text-base font-semibold">Dispute Filed</h3>
                      <p className="text-sm text-gray-600 mt-2">Metro Credit Union filed a dispute against the claim, citing contractual terms violation.</p>
                    </div>
                    <div className="mb-10">
                      <div className="absolute w-3 h-3 -left-1.5 mt-1.5 rounded-full bg-purple-500 border-2 border-white"></div>
                      <time className="text-sm font-medium text-gray-400 mb-1 block">{formatDate(disputeData.original_claim.date)} 11:30 AM</time>
                      <h3 className="text-base font-semibold">Documentation Requested</h3>
                      <p className="text-sm text-gray-600 mt-2">Additional documentation was requested from both parties to support the dispute review.</p>
                    </div>
                    <div className="mb-10">
                      <div className="absolute w-3 h-3 -left-1.5 mt-1.5 rounded-full bg-green-500 border-2 border-white"></div>
                      <time className="text-sm font-medium text-gray-400 mb-1 block">{formatDate(disputeData.original_claim.date)} 02:15 PM</time>
                      <h3 className="text-base font-semibold">Documentation Received</h3>
                      <p className="text-sm text-gray-600 mt-2">Security audit reports and compliance documentation received from both parties.</p>
                    </div>
                    <div>
                      <div className="absolute w-3 h-3 -left-1.5 mt-1.5 rounded-full bg-yellow-500 border-2 border-white"></div>
                      <time className="text-sm font-medium text-gray-400 mb-1 block">{formatDate(disputeData.original_claim.date)} 04:30 PM</time>
                      <h3 className="text-base font-semibold">Under Review</h3>
                      <p className="text-sm text-gray-600 mt-2">Dispute is currently under review by the resolution team.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Bank Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">M</span>
                  </div>
                  <div>
                    <p className="font-medium">{disputeData.bank.name}</p>
                    <p className="text-sm text-muted-foreground">{disputeData.bank.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p>{disputeData.bank.contact}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p>{disputeData.bank.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Fintech Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-bold">L</span>
                  </div>
                  <div>
                    <p className="font-medium">{disputeData.fintech.name}</p>
                    <p className="text-sm text-muted-foreground">{disputeData.fintech.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p>{disputeData.fintech.contact}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p>{disputeData.fintech.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Policy Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium">Policy Type</p>
                  <p>{disputeData.policy.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Policy Number</p>
                  <p>{disputeData.policy.number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Coverage Period</p>
                  <p>{disputeData.policy.coverage_period}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Coverage Amount</p>
                  <p>{formatCurrency(disputeData.policy.coverage_amount)} per incident</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Deductible</p>
                  <p>{formatCurrency(disputeData.policy.deductible)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
          <Button onClick={handleSubmitResolution}>Submit Resolution</Button>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}

/**
 * Standardized loading state using Invela loading spinner
 * Provides consistent loading experience across all pages
 */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">Loading dispute details...</p>
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
