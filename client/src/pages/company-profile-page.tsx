import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { ArrowLeft, Building2, Shield, Calendar, AlertTriangle, Ban, Globe, Users, Building, BookOpen, Briefcase, Target, Award, UserPlus, FileUp } from "lucide-react";
import type { Company, User, Document } from "@/types/company";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/ui/company-logo";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchBar } from "@/components/playground/SearchBar";
import { InviteUserModal } from "@/components/modals/InviteUserModal";
import { useState } from "react";
import { DataTable } from '@/components/ui/data-table'; // Changed to named import


// Helper function to generate consistent slugs
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

interface CompanyProfilePageProps {
  companySlug?: string;
}

export default function CompanyProfilePage({ companySlug }: CompanyProfilePageProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  const handleBackClick = () => {
    window.history.back();
  };

  const { data: companiesData = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const company = companiesData.find(item => {
    if (!companySlug || !item.name) return false;
    return generateSlug(item.name) === companySlug.toLowerCase();
  });

  // Update the useQuery for users to use the correct endpoint and add debug logs
  const { data: companyUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/by-company", company?.id],
    queryFn: () => {
      if (!company?.id && company?.id !== 0) throw new Error("No company ID");
      console.log("Debug - Fetching users for company ID:", company.id);
      console.log("Debug - Company data:", company);
      return fetch(`/api/users/by-company/${company.id}`).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      });
    },
    enabled: company?.id !== undefined,
    onSuccess: (data) => {
      console.log("Debug - Successfully fetched users:", data);
      console.log("Debug - Number of users fetched:", data.length);
    },
    onError: (error) => {
      console.error("Debug - Error fetching users:", error);
    }
  });

  // Filter users based on search
  const filteredUsers = companyUsers.filter((user) => {
    console.log("Debug - Filtering user:", user);
    if (!userSearchQuery) return true;
    const searchLower = userSearchQuery.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Filter files based on search
  const filteredFiles = (company?.documents || []).filter((doc) => {
    if (!fileSearchQuery) return true;
    return doc.name.toLowerCase().includes(fileSearchQuery.toLowerCase());
  });

  // Loading states
  if (companiesLoading) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-muted rounded"></div>
            <div className="h-4 w-48 bg-muted rounded"></div>
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  if (!companiesData || companiesData.length === 0) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Ban className="h-12 w-12 text-destructive" />
            <h2 className="text-2xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md text-center">
              You don't have permission to view this page.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  if (!company) {
    const attemptedCompanyName = companySlug
      ?.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return (
      <DashboardLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertTriangle className="h-12 w-12 text-warning" />
            <h2 className="text-2xl font-semibold">Company Not Found</h2>
            <p className="text-muted-foreground max-w-md text-center">
              There was no '{attemptedCompanyName}' company found in your network.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  const renderOverviewTab = () => {
    return (
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Company Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold capitalize">{company.category?.toLowerCase() || 'N/A'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Accreditation Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  company.accreditationStatus === 'PENDING' && "bg-yellow-100 text-yellow-800",
                  company.accreditationStatus === 'IN_REVIEW' && "bg-yellow-100 text-yellow-800",
                  company.accreditationStatus === 'PROVISIONALLY_APPROVED' && "bg-green-100 text-green-800",
                  company.accreditationStatus === 'APPROVED' && "bg-green-100 text-green-800",
                  company.accreditationStatus === 'SUSPENDED' && "bg-gray-100 text-gray-800",
                  company.accreditationStatus === 'REVOKED' && "bg-red-100 text-red-800",
                  company.accreditationStatus === 'EXPIRED' && "bg-red-100 text-red-800",
                  company.accreditationStatus === 'AWAITING_INVITATION' && "bg-gray-100 text-gray-800"
                )}
              >
                {company.accreditationStatus?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RiskMeter score={company.riskScore || 0} />
            </CardContent>
          </Card>
        </div>

        {/* Company Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Overview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-muted-foreground" />
                Company Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Website</div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {company.websiteUrl && company.websiteUrl !== 'N/A' ? (
                    <a
                      href={company.websiteUrl.startsWith('http') ? company.websiteUrl : `https://${company.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {company.websiteUrl}
                    </a>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Legal Structure</div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{company.legalStructure || 'N/A'}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Headquarters</div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{company.hqAddress || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Incorporation Year</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{company.incorporationYear || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Employees</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{company.numEmployees || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Products & Services</div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{company.productsServices || 'N/A'}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Investors</div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground mt-1" />
                  <span>{company.investors || 'No investor information available'}</span>
                </div>
              </div>
              {company.fundingStage && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Funding Stage</div>
                  <span>{company.fundingStage}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Key Relationships and Leadership Section - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Key Relationships Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                Key Relationships
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Key Clients & Partners</div>
                <div className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-muted-foreground mt-1" />
                  <span>{company.keyClientsPartners || 'No client/partner information available'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leadership Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Leadership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Founders & Leadership</div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-1" />
                  <span>{company.foundersAndLeadership || 'No leadership information available'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderUsersTab = () => {
    console.log("Debug - Rendering users tab with data:", filteredUsers);
    const columns = [
      {
        key: "fullName",
        header: "Name",
        type: "icon" as const,
        sortable: true,
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
      },
      {
        key: "onboardingCompleted",
        header: "Status",
        type: "status" as const,
      },
      {
        key: "actions",
        header: "",
        type: "actions" as const,
      },
    ];

    // Transform users data to match what DataTable expects
    const tableData = filteredUsers.map(user => {
      console.log("Debug - Transforming user data:", user);
      return {
        ...user,
        onboardingCompleted: user.onboardingCompleted ? 'Active' : 'Pending'
      };
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <SearchBar
              placeholder="Search users..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            onClick={() => setShowInviteModal(true)}
            className="w-full md:w-auto whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Users</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded w-full max-w-md"></div>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            ) : (
              <DataTable
                data={tableData}
                columns={columns}
                isLoading={usersLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFilesTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <SearchBar
              placeholder="Search files..."
              value={fileSearchQuery}
              onChange={(e) => setFileSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Button className="w-full md:w-auto whitespace-nowrap">
            <FileUp className="h-4 w-4 mr-2" />
            File Request
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Files</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFiles.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredFiles.map((doc: Document, index: number) => (
                  <div key={`${doc.documentId || index}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-4">
                    <span className="font-medium">{doc.name}</span>
                    <Badge variant={doc.status === 'verified' ? 'outline' : 'secondary'} className="mt-2 sm:mt-0">
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No files found</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRiskTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Overall Risk Score</h3>
                <div className="w-full max-w-md">
                  <RiskMeter score={company.riskScore || 0} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Risk Factors</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Age</p>
                    <p>{company.incorporationYear ? `${new Date().getFullYear() - company.incorporationYear} years` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Accreditation Status</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize mt-1",
                        company.accreditationStatus === 'APPROVED' && "bg-green-100 text-green-800"
                      )}
                    >
                      {company.accreditationStatus?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Compliance Status</p>
                    <p>{company.certificationsCompliance || 'No compliance information available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="space-y-6">
          {/* Back to Network button */}
          <div className="flex items-center justify-start">
            <Button
              variant="outline"
              size="sm"
              className="text-sm font-medium bg-white border-muted-foreground/20"
              onClick={handleBackClick}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Network
            </Button>
          </div>

          {/* Company header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-lg shadow-[4px_4px_10px_0px_rgba(0,0,0,0.1),-4px_-4px_10px_0px_rgba(255,255,255,0.9)] aspect-square">
                <div className="absolute inset-0 flex items-center justify-center p-3">
                  <CompanyLogo companyId={company?.id} companyName={company?.name} size="lg" />
                </div>
              </div>
              <PageHeader
                title={company?.name}
                description={company?.description || "No description available"}
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="px-4">Overview</TabsTrigger>
              <TabsTrigger value="users" className="px-4">Users</TabsTrigger>
              <TabsTrigger value="files" className="px-4">Files</TabsTrigger>
              <TabsTrigger value="risk" className="px-4">Risk</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="overview">
                {renderOverviewTab()}
              </TabsContent>

              <TabsContent value="users">
                {usersLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-muted rounded w-full max-w-md"></div>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-muted rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  renderUsersTab()
                )}
              </TabsContent>

              <TabsContent value="files">
                {renderFilesTab()}
              </TabsContent>

              <TabsContent value="risk">
                {renderRiskTab()}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Update the InviteUserModal to include company information */}
        {showInviteModal && (
          <InviteUserModal
            open={showInviteModal}
            onOpenChange={setShowInviteModal}
            companyId={company?.id || 0}
            companyName={company?.name || ''}
          />
        )}
      </PageContainer>
    </DashboardLayout>
  );
}