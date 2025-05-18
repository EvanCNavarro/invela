import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowLeft, Building2, Globe, Users, Calendar, Briefcase, Target, Award, FileText, Shield, Search, UserPlus, Download, CheckCircle, AlertCircle, BadgeCheck, ExternalLink, ChevronRight, Star, DollarSign, Award as BadgeIcon } from "lucide-react";
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
  // Support both naming conventions for accreditation status
  accreditationStatus?: string;
  accreditation_status?: string;
  revenueTier?: string;
  risk_clusters?: {
    financial: number;
    operational: number;
    compliance: number;
    strategic: number;
    reputational: number;
    cybersecurity: number;
  };
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

/**
 * Helper function to get the accreditation status from a company object
 * regardless of which property naming convention is used
 * 
 * @param company The company data object
 * @returns The accreditation status string or undefined if not found
 */
// Extracts accreditation status from company data regardless of property naming convention
function getCompanyAccreditationStatus(company: CompanyProfileData | any): string | undefined {
  // First check for camelCase version (standardized)
  if (company.accreditationStatus) {
    return company.accreditationStatus;
  }
  
  // Then check for snake_case version (legacy API format)
  // Using bracket notation to avoid TypeScript errors with dynamic properties
  if (company['accreditation_status']) {
    return company['accreditation_status'];
  }
  
  // Return undefined if neither property exists
  return undefined;
}

/**
 * Helper function to determine the display category based on accreditation status
 * 
 * Maps the detailed status values to one of three categories for UI purposes:
 * - VALID: Approved companies
 * - PENDING: Companies that are under review or in process
 * - INVALID: Companies with revoked access
 * 
 * Also handles legacy status values for backward compatibility
 */
const getAccreditationStatus = (status: string | null | undefined): 'VALID' | 'PENDING' | 'INVALID' => {
  if (!status) return 'INVALID';

  // Normalize status to uppercase for case-insensitive comparison
  const normalizedStatus = status.toUpperCase();
  
  // Handle case where status might be "NULL" as a string instead of actual null
  if (normalizedStatus === 'NULL') return 'INVALID';

  // New status mappings
  if (normalizedStatus === 'APPROVED') return 'VALID';
  if (normalizedStatus === 'UNDER_REVIEW' || normalizedStatus === 'IN_PROCESS') return 'PENDING';
  if (normalizedStatus === 'REVOKED') return 'INVALID';
  
  // Legacy status mappings for backward compatibility
  if (['PROVISIONALLY_APPROVED'].includes(normalizedStatus)) return 'VALID';
  if (['IN_REVIEW', 'PENDING'].includes(normalizedStatus)) return 'PENDING';
  if (['EXPIRED', 'SUSPENDED', 'AWAITING_INVITATION'].includes(normalizedStatus)) return 'INVALID';
  
  // Default fallback
  return 'INVALID';
};

// Helper function to get the appropriate box style based on the status
const getAccreditationBoxStyle = (status: string | null | undefined): React.CSSProperties => {
  const normalizedStatus = getAccreditationStatus(status);
  
  switch (normalizedStatus) {
    case 'VALID':
      return {
        backgroundColor: 'rgba(243, 254, 246, 0.5)', // Even softer green matching blue
        borderColor: '#22c55e', // Solid green border
        borderLeft: '3px solid #22c55e', // Colored border accent
        boxShadow: '5px 5px 15px 0px rgba(148,163,184,0.1), -5px -5px 15px 0px rgba(255,255,255,0.7)' // Neumorphic shadow
      };
    case 'PENDING':
      return {
        backgroundColor: 'rgba(255, 253, 237, 0.5)', // Even softer yellow matching blue
        borderColor: '#eab308', // Solid yellow border
        borderLeft: '3px solid #eab308', // Colored border accent
        boxShadow: '5px 5px 15px 0px rgba(148,163,184,0.1), -5px -5px 15px 0px rgba(255,255,255,0.7)' // Neumorphic shadow
      };
    default:
      return {
        backgroundColor: 'rgba(254, 245, 245, 0.5)', // Even softer red matching blue
        borderColor: '#f87171', // Solid red border
        borderLeft: '3px solid #f87171', // Colored border accent
        boxShadow: '5px 5px 15px 0px rgba(148,163,184,0.1), -5px -5px 15px 0px rgba(255,255,255,0.7)' // Neumorphic shadow
      };
  }
};

// Helper function to get the appropriate text style based on the status
const getAccreditationTextStyle = (status: string | null | undefined): React.CSSProperties => {
  const normalizedStatus = getAccreditationStatus(status);
  
  switch (normalizedStatus) {
    case 'VALID':
      return {
        color: '#22c55e' // Slightly softer green
      };
    case 'PENDING':
      return {
        color: '#eab308' // Slightly softer yellow
      };
    default:
      return {
        color: '#f87171' // Slightly softer red
      };
  }
};

/**
 * Helper function to get a user-friendly label for the accreditation status
 * 
 * Converts the raw accreditation status to a formatted display label,
 * handling both new status values and legacy status values
 */
const getAccreditationStatusLabel = (status: string | null | undefined): React.ReactNode => {
  if (!status) return 'Not Available';
  
  // Convert to uppercase for case-insensitive comparison
  const normalizedStatus = status.toUpperCase();
  
  // Handle new status formats with proper formatting
  switch (normalizedStatus) {
    case 'APPROVED':
      return 'Approved';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'IN_PROCESS':
      return 'In Process';
    case 'REVOKED':
      return 'Revoked';
      
    // Legacy status values with proper formatting
    case 'PROVISIONALLY_APPROVED':
      return 'Provisionally Approved'; 
    case 'IN_REVIEW':
      return 'Under Review';
    case 'PENDING':
      return 'In Process';
    case 'SUSPENDED':
      return 'Suspended';
    case 'EXPIRED':
      return 'Expired';
    default:
      // Format any other values by replacing underscores with spaces and capitalizing
      return normalizedStatus
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
};

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
    queryFn: async () => {
      // Only show users associated with this company
      const response = await fetch(`/api/companies/${companyId}/users`);
      if (!response.ok) {
        throw new Error("Error fetching company users");
      }
      return response.json();
    },
    enabled: activeTab === "users"
  });

  const { data: files = [] } = useQuery<CompanyFile[]>({
    queryKey: ["/api/companies", companyId, "files"],
    queryFn: async () => {
      // Only show files uploaded by users of this company
      const response = await fetch(`/api/companies/${companyId}/files`);
      if (!response.ok) {
        throw new Error("Error fetching company files");
      }
      return response.json();
    },
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
              <span className="leading-tight">S&P Data Access<br />Risk Score</span>
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
              <UiBadge variant="outline">{company.fundingStage}</UiBadge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <InviteButton
          variant="user"
          pulse={false}
          onClick={() => setOpenUserModal(true)}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Company Users</CardTitle>
          <div className="relative max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-8 w-[200px] h-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter(user => 
                  user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                )
                .map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
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

  // Default risk clusters if none are provided in the company data
  const defaultRiskClusters = {
    financial: 37,  // Converted from 550/1500 * 100
    operational: 32, // Converted from 480/1500 * 100
    compliance: 41,  // Converted from 620/1500 * 100
    strategic: 33,   // Converted from 500/1500 * 100
    reputational: 30, // Converted from 450/1500 * 100
    cybersecurity: 39 // Converted from 580/1500 * 100
  };

  // Use company's risk clusters or fallback to defaults
  const riskClusters = company.risk_clusters || defaultRiskClusters;
  
  const renderRiskTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="leading-tight">S&P Data Access<br />Risk Score</span>
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
          <CardFooter className="flex justify-center border-t pt-4">
            <div className="text-sm text-muted-foreground text-center">
              {company.category === "Bank" || company.category === "Invela" ? 
                "As a regulatory institution, you can adjust this risk score." :
                "Risk score is determined by objective criteria and data analysis."
              }
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Categories</CardTitle>
            <p className="text-sm text-muted-foreground">Breakdown of risk factors by category</p>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center">
            <RiskRadarChart 
              companyId={company.id}
              showDropdown={false}
            />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Risk Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 bg-slate-50 p-4 rounded-md">
              <h4 className="font-medium flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Critical Risk Areas
              </h4>
              <ul className="pl-5 text-sm space-y-1">
                {Object.entries(riskClusters).filter(([_, value]) => value > 66).length > 0 ? (
                  Object.entries(riskClusters)
                    .filter(([_, value]) => value > 66)
                    .map(([key, value]) => (
                      <li key={key} className="list-disc">
                        <span className="capitalize">{key}</span>: {value} points
                      </li>
                    ))
                ) : (
                  <li className="text-muted-foreground">No critical risk areas found</li>
                )}
              </ul>
            </div>
            
            <div className="space-y-2 bg-slate-50 p-4 rounded-md">
              <h4 className="font-medium flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                Moderate Risk Areas
              </h4>
              <ul className="pl-5 text-sm space-y-1">
                {Object.entries(riskClusters).filter(([_, value]) => value >= 34 && value <= 66).map(([key, value]) => (
                  <li key={key} className="list-disc">
                    <span className="capitalize">{key}</span>: {value} points
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-2 bg-slate-50 p-4 rounded-md">
              <h4 className="font-medium flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Low Risk Areas
              </h4>
              <ul className="pl-5 text-sm space-y-1">
                {Object.entries(riskClusters).filter(([_, value]) => value < 34).map(([key, value]) => (
                  <li key={key} className="list-disc">
                    <span className="capitalize">{key}</span>: {value} points
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start border-t pt-4 space-y-2">
          <h4 className="font-medium">Risk Factors Considered</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-sm">
            <div>
              <div className="text-muted-foreground">Company Age</div>
              <p>{companyAge ? `${companyAge} years` : 'N/A'}</p>
            </div>
            <div>
              <div className="text-muted-foreground">Market Presence</div>
              <p>{company.category || 'N/A'}</p>
            </div>
            <div>
              <div className="text-muted-foreground">Employee Count</div>
              <p>{company.numEmployees || 'N/A'}</p>
            </div>
            <div>
              <div className="text-muted-foreground">Legal Structure</div>
              <p>{company.legalStructure || 'N/A'}</p>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
      {/* Add tutorial manager for company profile page */}
      <TutorialManager tabName="company-profile" />
      
      <PageTemplate
        showBreadcrumbs
      >
        <div className="space-y-6">
          {/* Navigation and back button completely removed per requirements */}
          <div className="flex items-center justify-between mb-6">
            {/* Empty div to maintain spacing */}
          </div>
          
          {/* Modern company profile header with enhanced aesthetics */}
          <div className="relative mb-6 overflow-hidden bg-gradient-to-r from-white to-slate-50 rounded-xl shadow-sm border border-slate-100">
            {/* Optional decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full -mr-20 -mt-20 opacity-30"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-50 rounded-full -ml-12 -mb-12 opacity-30"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-start gap-6 p-6">
              {/* Logo container with enhanced neuomorphic style */}
              <div className="relative w-24 h-24 min-w-24 rounded-xl flex items-center justify-center overflow-hidden 
                  bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-[5px_5px_15px_0px_rgba(148,163,184,0.1),-5px_-5px_15px_0px_rgba(255,255,255,0.7)]">
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-500">
                  <CompanyLogo companyId={company.id} companyName={company.name} size="lg" />
                </div>
                
                {/* Category indicator dot removed per requirements */}
              </div>
              
              {/* Company information with better information hierarchy */}
              <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{company.name}</h1>
                    
                    {/* Category badge with grayscale styling */}
                    {company.category && (
                      <div 
                        className="rounded-md px-3 py-0.5 text-xs font-semibold text-white bg-gray-600"
                      >
                        {company.category}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm font-normal mt-1.5 max-w-2xl">
                    {company.description || "No description available"}
                  </p>
                </div>
                
                {/* Company metadata badges with slightly rounded corners */}
                <div className="flex flex-wrap items-center gap-2">
                  {company.revenueTier && (
                    <div className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                      <DollarSign className="h-3.5 w-3.5" />
                      {company.revenueTier}
                    </div>
                  )}
                  
                  {company.legalStructure && (
                    <div className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                      <Building2 className="h-3.5 w-3.5" />
                      {company.legalStructure}
                    </div>
                  )}
                  
                  {company.fundingStage && (
                    <div className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                      <Briefcase className="h-3.5 w-3.5" />
                      {company.fundingStage}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Enhanced metrics cards - same size, no hover, black titles with gradient backgrounds */}
              <div className="flex flex-col md:flex-row items-stretch gap-3 self-stretch md:self-auto">
                {/* Risk Score card with Invela blue background gradient */}
                <div 
                  className="flex flex-col justify-between p-4 rounded-lg border text-center md:w-52"
                  style={{ 
                    backgroundColor: 'rgba(236, 241, 255, 0.5)', // Even softer blue that matches other colors
                    borderColor: '#4965EC', // Solid Invela blue border
                    borderLeft: '3px solid #4965EC', // Colored border accent
                    boxShadow: '5px 5px 15px 0px rgba(148,163,184,0.1), -5px -5px 15px 0px rgba(255,255,255,0.7)' // Neumorphic shadow
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-1 mb-1">
                    <Award className="h-5 w-5 text-black mb-0.5" />
                    <div className="text-xs text-black font-medium leading-tight">
                      S&P DATA ACCESS<br />RISK SCORE
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-1 py-1">
                    {company.riskScore || 0}
                  </div>
                </div>
                
                {/* Accreditation status with color-coded background */}
                <div 
                  className="flex flex-col justify-between p-4 rounded-lg border text-center md:w-52"
                  style={getAccreditationBoxStyle(getCompanyAccreditationStatus(company))}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <BadgeCheck className="h-5 w-5 text-black" />
                    <div className="text-sm text-black font-medium">
                      ACCREDITATION
                    </div>
                  </div>
                  {/* Extract status once to avoid multiple function calls */}
                  {(() => {
                    const status = getCompanyAccreditationStatus(company);
                    return (
                      <div 
                        className="text-lg font-semibold py-2"
                        style={getAccreditationTextStyle(status)}
                      >
                        {getAccreditationStatusLabel(status)}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Tab navigation with cleaner styling */}
          <div className="mt-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-gray-200">
                <TabsList className="bg-transparent h-10 mb-0 p-0">
                  <TabsTrigger value="overview" className="rounded-none border-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:font-medium data-[state=active]:text-blue-700 px-5 h-10">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="users" className="rounded-none border-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:font-medium data-[state=active]:text-blue-700 px-5 h-10">
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="files" className="rounded-none border-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:font-medium data-[state=active]:text-blue-700 px-5 h-10">
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="risk" className="rounded-none border-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:font-medium data-[state=active]:text-blue-700 px-5 h-10">
                    Risk
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="pt-6">
                <TabsContent value="overview" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  {renderOverviewTab()}
                </TabsContent>
                <TabsContent value="users" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  {renderUsersTab()}
                </TabsContent>
                <TabsContent value="files" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  {renderFilesTab()}
                </TabsContent>
                <TabsContent value="risk" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  {renderRiskTab()}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}