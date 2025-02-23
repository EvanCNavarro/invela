import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { ArrowLeft, Building2, Shield, Calendar, AlertTriangle, Ban, Globe, Users, Building, BookOpen, Briefcase, Target, Award, UserPlus, FileUp } from "lucide-react";
import type { Company, User, Document, AccreditationStatus } from "@/types/company";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/ui/company-logo";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchBar } from "@/components/playground/SearchBar";
import { InviteButton } from "@/components/ui/invite-button";
import { InviteModal } from "@/components/playground/InviteModal";
import { useState, useEffect } from "react";
import { DataTable } from '@/components/ui/data-table';

// Helper function to generate consistent slugs
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Helper function to find company by slug
const findCompanyBySlug = (companies: CompanyProfileData[], slug: string) => {
  if (!Array.isArray(companies)) return null;
  return companies.find(c => generateSlug(c.name || '') === slug);
};

interface CompanyProfileData {
  id: number;
  name: string;
  category: string;
  description: string | null;
  logo_id: number | null;
  accreditation_status: AccreditationStatus;
  risk_score: number | null;
  onboarding_company_completed: boolean;
  has_relationship: boolean;
  websiteUrl: string;
  legalStructure: string;
  hqAddress: string;
  numEmployees: string;
  productsServices: string[];
  incorporationYear: string | number;
  investors: string;
  fundingStage: string | null;
  keyClientsPartners: string[];
  foundersAndLeadership: string;
  documents?: Document[];
  certificationsCompliance?: string;
}

export default function CompanyProfilePage() {
  // Get the company slug from the URL parameters using the new route parameter name
  const { companySlug } = useParams();

  console.log("[CompanyProfile] Route params:", {
    params: useParams(),
    extractedSlug: companySlug,
    fullPath: window.location.pathname
  });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Get the initial tab value from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    console.log("[CompanyProfile] Tab params:", { tabParam, activeTab });
    if (tabParam && ['overview', 'users', 'files', 'risk'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    console.log("[CompanyProfile] Tab changed:", { from: activeTab, to: value });
    setActiveTab(value);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', value);
    window.history.replaceState({}, '', newUrl.toString());
  };

  const handleBackClick = () => {
    window.history.back();
  };

  // Fetch all companies with improved error handling and type checking
  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useQuery<CompanyProfileData[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      console.log("[CompanyProfile] Fetching all companies");
      try {
        const response = await fetch("/api/companies");
        if (!response.ok) {
          console.error("[CompanyProfile] API error:", {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Log the actual response data for debugging
        console.log("[CompanyProfile] Raw API response:", {
          data,
          type: typeof data,
          isArray: Array.isArray(data)
        });

        // Ensure we have a valid array response
        if (!Array.isArray(data)) {
          console.error("[CompanyProfile] Invalid data format:", data);
          return [];
        }

        return data;
      } catch (error) {
        console.error("[CompanyProfile] Error fetching companies:", error);
        throw error; // Let React Query handle the error
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  // Find company using the helper function
  const company = companySlug ? findCompanyBySlug(companies, companySlug) : null;

  console.log("[CompanyProfile] Company lookup:", {
    searchSlug: companySlug,
    foundCompany: company?.id ? { id: company.id, name: company.name } : null,
    matchFound: !!company,
    availableCompanies: companies.map(c => ({
      id: c.id,
      name: c.name,
      slug: generateSlug(c.name || '')
    }))
  });

  // Fetch company users if we have a company
  const { data: companyUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/by-company", company?.id],
    queryFn: async () => {
      if (!company?.id) throw new Error("No company ID");
      console.log("[CompanyProfile] Fetching users for company:", company.id);
      const response = await fetch(`/api/users/by-company/${company.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!company?.id
  });

  // Filter users based on search
  const filteredUsers = companyUsers.filter((user) => {
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

  // Loading state
  if (companiesLoading) {
    console.log("[CompanyProfile] Loading state:", { companiesLoading });
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-muted rounded"></div>
            <div className="h-4 w-48 bg-muted rounded"></div>
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Add error state
  if (companiesError) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-2xl font-semibold">Error Loading Companies</h2>
            <p className="text-muted-foreground max-w-md text-center">
              There was an error loading the company data. Please try again later.
            </p>
            <Button variant="outline" onClick={handleBackClick}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Company not found state
  if (!company) {
    console.log("[CompanyProfile] Not found state:", {
      companyId: undefined,
      company: undefined,
      attemptedSlug: companySlug
    });
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Ban className="h-12 w-12 text-destructive" />
            <h2 className="text-2xl font-semibold">Company Not Found</h2>
            <p className="text-muted-foreground max-w-md text-center">
              Company not found.
            </p>
            <Button variant="outline" onClick={handleBackClick}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // No relationship state
  if (!company.has_relationship) {
    console.log("[CompanyProfile] Access restricted - no relationship");
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertTriangle className="h-12 w-12 text-warning" />
            <h2 className="text-2xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md text-center">
              You don't have permission to view this company's information.
            </p>
            <Button variant="outline" onClick={handleBackClick}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  const renderOverviewTab = () => {
    console.log("[CompanyProfile] Rendering Overview Tab");
    return (
      <div className="space-y-6">
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
                  company.accreditation_status === 'PENDING' && "bg-yellow-100 text-yellow-800",
                  company.accreditation_status === 'IN_REVIEW' && "bg-yellow-100 text-yellow-800",
                  company.accreditation_status === 'PROVISIONALLY_APPROVED' && "bg-green-100 text-green-800",
                  company.accreditation_status === 'APPROVED' && "bg-green-100 text-green-800",
                  company.accreditation_status === 'SUSPENDED' && "bg-gray-100 text-gray-800",
                  company.accreditation_status === 'REVOKED' && "bg-red-100 text-red-800",
                  company.accreditation_status === 'EXPIRED' && "bg-red-100 text-red-800",
                  company.accreditation_status === 'AWAITING_INVITATION' && "bg-gray-100 text-gray-800"
                )}
              >
                {company.accreditation_status?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
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
              <RiskMeter score={company.risk_score || 0} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <span>{company.productsServices?.join(', ') || 'N/A'}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <span>{company.keyClientsPartners?.join(', ') || 'No client/partner information available'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
        key: "actions",
        header: "",
        type: "actions" as const,
      },
    ];

    const tableData = filteredUsers.map(user => ({ ...user }));

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
          <InviteButton
            variant="user"
            pulse={true}
            onClick={() => setShowInviteModal(true)}
          />
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
    console.log("[CompanyProfile] Rendering Files Tab");
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
    console.log("[CompanyProfile] Rendering Risk Tab");
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
                  <RiskMeter score={company.risk_score || 0} />
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
                        company.accreditation_status === 'APPROVED' && "bg-green-100 text-green-800"
                      )}
                    >
                      {company.accreditation_status?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
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
      <PageTemplate
        showBreadcrumbs
        headerActions={
          <Button
            variant="outline"
            size="sm"
            className="text-sm font-medium bg-white border-muted-foreground/20"
            onClick={handleBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Network
          </Button>
        }
      >
        <div className="space-y-6">
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

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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

        {showInviteModal && (
          <InviteModal
            variant="user"
            open={showInviteModal}
            onOpenChange={setShowInviteModal}
            companyId={company?.id || 0}
            companyName={company?.name || ''}
          />
        )}
      </PageTemplate>
    </DashboardLayout>
  );
}