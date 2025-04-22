import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowLeft, Building2, Globe, Users, Calendar, Briefcase, Target, Award, FileText, Shield, Search, UserPlus, Download, CheckCircle, AlertCircle, BadgeCheck, ExternalLink } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { InviteButton } from "@/components/ui/invite-button";
import { InviteModal } from "@/components/playground/InviteModal";
import { companyTypeColors } from "@/components/network/types";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";
import { useState } from "react";

interface CompanyProfileData {
  id: number;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  numEmployees: string | null;
  incorporationYear: number | null;
  category: string;
  productsServices: string[];
  keyClientsPartners: string[];
  investors: string;
  fundingStage: string | null;
  legalStructure: string;
  hqAddress: string;
  riskScore: number;
  risk_score?: number;
  chosenScore?: number;
  chosen_score?: number;
}

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface CompanyFile {
  id: number;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

export default function CompanyProfilePage() {
  const params = useParams();
  const companyId = params.companySlug;
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [openUserModal, setOpenUserModal] = useState(false);

  const handleBackClick = () => {
    window.history.back();
  };

  const { data: company, isLoading, error } = useQuery<CompanyProfileData>({
    queryKey: ["/api/companies", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("No company ID provided");
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) {
        throw new Error("Error fetching company details");
      }
      return response.json();
    }
  });

  const { data: users = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/companies", companyId, "users"],
    enabled: activeTab === "users"
  });

  const { data: files = [] } = useQuery<CompanyFile[]>({
    queryKey: ["/api/companies", companyId, "files"],
    enabled: activeTab === "files"
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <h2 className="text-2xl font-semibold">Error Loading Company</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Failed to load company data"}
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

  const companyAge = company.incorporationYear
    ? new Date().getFullYear() - company.incorporationYear
    : null;

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskMeter 
              score={company.riskScore || company.risk_score || 0}
              chosenScore={company.chosenScore || company.chosen_score}
              companyId={company.id || 0}
              companyType={company.category || "FinTech"}
              canAdjust={company.category === "Bank" || company.category === "Invela"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Category</div>
              <span>{company.category || 'Not available'}</span>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Website</div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {company.websiteUrl ? (
                  <a
                    href={company.websiteUrl.startsWith('http') ? company.websiteUrl : `https://${company.websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {company.websiteUrl}
                  </a>
                ) : (
                  <span>Not available</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Headquarters</div>
              <span>{company.hqAddress || 'Not available'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Employees</div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{company.numEmployees || 'Not available'}</span>
              </div>
            </div>
            {companyAge !== null && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Company Age</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{companyAge} years</span>
                </div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Legal Structure</div>
              <span>{company.legalStructure || 'Not available'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Investment Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Investors</div>
            <span>{company.investors || 'No investor information available'}</span>
          </div>
          {company.fundingStage && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Funding Stage</div>
              <Badge variant="outline">{company.fundingStage}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <InviteButton
          variant="user"
          pulse={false}
          onClick={() => setOpenUserModal(true)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{new Date(user.joinedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InviteModal
        variant="user"
        open={openUserModal}
        onOpenChange={setOpenUserModal}
        companyId={parseInt(companyId || "0")}
        companyName={company.name}
      />
    </div>
  );

  const renderFilesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={fileSearchQuery}
            onChange={(e) => setFileSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>{file.name}</TableCell>
                  <TableCell>{file.type}</TableCell>
                  <TableCell>{file.size}</TableCell>
                  <TableCell>{file.uploadedBy}</TableCell>
                  <TableCell>{new Date(file.uploadedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderRiskTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskMeter 
              score={company.riskScore || company.risk_score || 0}
              chosenScore={company.chosenScore || company.chosen_score}
              companyId={company.id || 0}
              companyType={company.category || "FinTech"}
              canAdjust={company.category === "Bank" || company.category === "Invela"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Factors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Company Age</div>
              <p>{companyAge ? `${companyAge} years` : 'N/A'}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Market Presence</div>
              <p>{company.category || 'N/A'}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Employee Count</div>
              <p>{company.numEmployees || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <PageTemplate
        showBreadcrumbs
      >
        <div className="space-y-6">
          {/* Back button on the left */}
          <div className="flex items-center justify-start mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackClick}
              className="border border-gray-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Network
            </Button>
          </div>
          
          {/* Company header with centered logo in a square box */}
          <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-6 rounded-lg shadow-sm">
            <div className="relative w-24 h-24 min-w-24 rounded-md shadow-md flex items-center justify-center overflow-hidden bg-slate-100">
              <div className="flex items-center justify-center w-full h-full">
                <CompanyLogo companyId={company.id} companyName={company.name} size="lg" />
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-start space-y-2">
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <p className="text-muted-foreground text-sm text-center md:text-left">
                {company.description || "No description available"}
              </p>
              
              {/* Metadata chips for company type */}
              <div className="flex items-center gap-2 mt-2">
                {company.category && (
                  <Badge 
                    className="px-2 py-1"
                    style={{ 
                      backgroundColor: companyTypeColors[company.category] || companyTypeColors.Default,
                      color: 'white'
                    }}
                  >
                    {company.category}
                  </Badge>
                )}
                
                {company.accreditationStatus === 'VALID' && (
                  <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-600">
                    <BadgeCheck className="h-3 w-3" />
                    Accredited
                  </Badge>
                )}
                
                {company.revenueTier && (
                  <Badge variant="outline" className="px-2 py-1">
                    {company.revenueTier}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="ml-auto flex-shrink-0 flex items-center justify-center md:justify-end space-x-2 mt-4 md:mt-0">
              <div className="flex flex-col items-center md:items-end rounded-md bg-slate-50 px-4 py-2 md:mr-2">
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <span className="text-2xl font-bold">
                  {company.riskScore || company.risk_score || 0}
                </span>
              </div>
              {company.accreditationStatus && (
                <div className="flex flex-col items-center md:items-end bg-green-50 px-4 py-2 rounded-md border border-green-100">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="font-medium text-green-600">
                    {company.accreditationStatus}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              {renderOverviewTab()}
            </TabsContent>
            <TabsContent value="users">
              {renderUsersTab()}
            </TabsContent>
            <TabsContent value="files">
              {renderFilesTab()}
            </TabsContent>
            <TabsContent value="risk">
              {renderRiskTab()}
            </TabsContent>
          </Tabs>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}