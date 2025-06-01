import React from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowLeft, Building2, Globe, Users, Calendar, Briefcase, Target, Award, FileText, Shield, Search, UserPlus, Download, CheckCircle, AlertCircle, BadgeCheck, ExternalLink, ChevronRight, Star, DollarSign, Award as BadgeIcon, Tag, Layers, LucideShieldAlert, AlertTriangle, RefreshCw } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { InviteButton } from "@/components/ui/invite-button";
import { InviteModal } from "@/components/playground/InviteModal";
import { companyTypeColors } from "@/components/network/types";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";
import { BentoOverview } from "@/components/company/BentoOverview";
import { AccreditationStatusDisplay } from "@/components/company/AccreditationStatusDisplay";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyProfileData {
  id: number;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  numEmployees: string | null;
  incorporationYear: number | null;
  category: string;
  productsServices: string[] | string;
  keyClientsPartners: string[] | string;
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
  revenue_tier?: string;
  risk_clusters?: {
    'Cyber Security': number;
    'Financial Stability': number;
    'Potential Liability': number;
    'Dark Web Data': number;
    'Public Sentiment': number;
    'Data Access Scope': number;
    // For backward compatibility with older data
    financial?: number;
    operational?: number;
    compliance?: number;
    strategic?: number;
    reputational?: number;
    cybersecurity?: number;
  };
  // Additional fields that may be in the data
  certifications_compliance?: string;
  foundersAndLeadership?: string;
  founders_and_leadership?: string;
  // Any other fields
  [key: string]: any;
}

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
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
  const companyId = params.companyId;
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [openUserModal, setOpenUserModal] = useState(false);
  const { user, isLoading: authLoading } = useAuth();

  const handleBackClick = () => {
    window.history.back();
  };

  const { 
    data: company, 
    isLoading: companyLoading, 
    error,
    refetch: refetchCompany 
  } = useQuery<CompanyProfileData>({
    queryKey: ["/api/companies", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("No company ID provided");
      
      console.log(`[CompanyProfile] Fetching data for company ID: ${companyId}`);
      
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required");
          }
          if (response.status === 404) {
            throw new Error("Company not found");
          }
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[CompanyProfile] Successfully fetched data for: ${data.name || 'Unknown'}`);
        return data;
      } catch (error) {
        console.error("[CompanyProfile] Error fetching company:", error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !authLoading && !!companyId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { 
    data: users = [], 
    isLoading: usersLoading, 
    error: usersError 
  } = useQuery<CompanyUser[]>({
    queryKey: ["/api/companies", companyId, "users"],
    queryFn: async () => {
      // Only show users associated with this company
      try {
        const response = await fetch(`/api/companies/${companyId}/users`);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required");
          }
          throw new Error("Error fetching company users");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
    },
    enabled: activeTab === "users" && !authLoading,
    retry: 1,
    refetchOnWindowFocus: false
  });

  // More specific error handling - only treat company data errors as fatal
  const isAuthError = error?.message === "Authentication required";
  const isLoadingData = authLoading || companyLoading;
  const hasCriticalError = error; // Only company errors are critical

  // Debug logging
  if (company) {
    console.log("Company data loaded:", company.name);
  }
  
  if (isLoadingData) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  if (isAuthError) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Authentication Required</h2>
            <p className="text-gray-600 max-w-md">Your session may have expired. Please log in again to view this company profile.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Determine if this is a database connection issue
  const isDatabaseError = error?.message?.includes("database") || 
                          error?.message?.includes("connection") ||
                          error?.message?.includes("terminating");

  if (hasCriticalError && !company) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              {isDatabaseError ? (
                <Shield className="w-10 h-10 text-gray-500" />
              ) : (
                <AlertCircle className="w-10 h-10 text-gray-500" />
              )}
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {isDatabaseError 
                ? "Database Connection Error" 
                : "Error Loading Company"
              }
            </h2>
            <p className="text-gray-600 max-w-md">
              {isDatabaseError 
                ? "We're having trouble connecting to our database. This may be a temporary issue. Please try again in a few moments."
                : error instanceof Error 
                  ? error.message 
                  : "Failed to load company data"
              }
            </p>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => refetchCompany()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={handleBackClick}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Critical guard: Ensure company exists before proceeding
  if (!company) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Company Not Found</h2>
            <p className="text-gray-600 max-w-md">
              The requested company could not be loaded. This may be due to a temporary issue or the company may not exist.
            </p>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button variant="outline" onClick={handleBackClick}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Enhanced data validation with safe access patterns
  const safeCompanyData = {
    id: company.id || 0,
    name: company.name || "Unknown Company",
    description: company.description || "No description available",
    websiteUrl: company.websiteUrl || company.website_url || null,
    numEmployees: company.numEmployees || company.num_employees || null,
    incorporationYear: company.incorporationYear || company.incorporation_year || null,
    productsServices: company.productsServices || company.products_services || "Not specified",
    keyClientsPartners: company.keyClientsPartners || company.key_clients_partners || "Not specified",
    investors: company.investors || "Not specified",
    fundingStage: company.fundingStage || company.funding_stage || "Not specified",
    legalStructure: company.legalStructure || company.legal_structure || "Not specified",
    hqAddress: company.hqAddress || company.hq_address || "Not specified",
    riskScore: company.riskScore || company.risk_score || 0,
    chosenScore: company.chosenScore || company.chosen_score || null,
    accreditationStatus: company.accreditationStatus || company.accreditation_status || "PENDING",
    revenueTier: company.revenueTier || company.revenue_tier || "Not specified",
    category: company.category || "Unknown",
    riskClusters: company.riskClusters || company.risk_clusters || null,
    certificationsCompliance: company.certificationsCompliance || company.certifications_compliance || "Not specified",
    foundersAndLeadership: company.foundersAndLeadership || company.founders_and_leadership || "Not specified"
  };

  const companyAge = safeCompanyData.incorporationYear
    ? new Date().getFullYear() - safeCompanyData.incorporationYear
    : null;

  // Helper function to format data with proper handling of empty values
  const formatValue = (value: string | number | null | undefined, formatter?: (val: string | number) => React.ReactNode) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic text-sm">Not available</span>;
    }
    return formatter ? formatter(value) : value;
  };

  // Helper to parse arrays from strings
  const parseArrayField = (field: string | string[] | null | undefined): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      // Attempt to parse if it's a JSON string
      const parsed = JSON.parse(field as string);
      return Array.isArray(parsed) ? parsed : [field as string];
    } catch (e) {
      // If not JSON, split by commas
      if (typeof field === 'string') {
        return field.split(',').map(item => item.trim());
      }
      return [];
    }
  }

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!userSearchQuery) return true;
    const searchString = userSearchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(searchString)) ||
      (user.email && user.email.toLowerCase().includes(searchString)) ||
      (user.role && user.role.toLowerCase().includes(searchString))
    );
  });
  
  // Normalize product services for display
  const productServices = parseArrayField(company.productsServices);
  
  // Normalize clients & partners for display
  const clientsPartners = parseArrayField(company.keyClientsPartners);
  
  // Status badge component to standardize status display
  const getStatusBadge = (status: string | undefined | null) => {
    if (!status) return null;
    
    const normalizedStatus = getAccreditationStatus(status);
    const label = getAccreditationStatusLabel(status);
    
    const badgeColor = 
      normalizedStatus === 'VALID' ? 'bg-green-100 text-green-800 border-green-300' :
      normalizedStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
      'bg-red-100 text-red-800 border-red-300';
    
    const indicatorColor = 
      normalizedStatus === 'VALID' ? 'bg-green-500' :
      normalizedStatus === 'PENDING' ? 'bg-yellow-500' :
      'bg-red-500';
    
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeColor} border`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${indicatorColor}`}></span>
        {label}
      </div>
    );
  };

  // Default risk clusters if none are provided in the company data
  const defaultRiskClusters = {
    financial: 37,  // Converted from 550/1500 * 100
    operational: 32, // Converted from 480/1500 * 100
    compliance: 41,  // Converted from 620/1500 * 100
    strategic: 19,   // Converted from 280/1500 * 100
    reputational: 30, // Converted from 450/1500 * 100
    cybersecurity: 39 // Converted from 580/1500 * 100
  };

  // Use company's risk clusters or fallback to defaults
  const riskClusters = company.risk_clusters || defaultRiskClusters;

  const renderOverviewTab = () => {
    console.log("[CompanyProfile] renderOverviewTab called - company:", company?.name, "activeTab:", activeTab);
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Company Overview - {company?.name}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Description:</label>
              <p className="text-sm">{company?.description || 'Not available'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Category:</label>
              <p className="text-sm">{company?.category || 'Not available'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Website:</label>
              <p className="text-sm">{company?.websiteUrl || 'Not available'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Risk Score:</label>
              <p className="text-sm">{company?.riskScore || company?.risk_score || 'Not available'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Original overview tab design, now replaced by BentoOverview
  const _renderOriginalOverviewTab = () => (
    <div className="space-y-6">
      {/* Company Information Card */}
      <Card className="border border-gray-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <Building2 className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
            <CardTitle className="text-base font-medium text-gray-800">Company Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Left column - Company details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</h4>
                <p className="text-sm text-gray-700">{company.description || 'Not available'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Category</h4>
                  <div className="text-sm text-gray-700">{company.category || 'Not available'}</div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Website</h4>
                  {company.websiteUrl ? (
                    <a 
                      href={company.websiteUrl.startsWith('http') ? company.websiteUrl : `https://${company.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {company.websiteUrl}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500 italic">Not available</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Employees</h4>
                  <div className="text-sm text-gray-700">{company.numEmployees || 'Not available'}</div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Founded</h4>
                  <div className="text-sm text-gray-700">{company.incorporationYear || 'Not available'}</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Headquarters</h4>
                <div className="text-sm text-gray-700">{company.hqAddress || 'Not available'}</div>
              </div>
            </div>
            
            {/* Right column - Business details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Products & Services</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {productServices.length > 0 ? (
                    productServices.map((item, index) => (
                      <div 
                        key={index} 
                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">Not available</span>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Clients & Partners</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {clientsPartners.length > 0 ? (
                    clientsPartners.map((item, index) => (
                      <div 
                        key={index} 
                        className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">Not available</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Revenue Tier</h4>
                  <div className="text-sm text-gray-700">
                    {company.revenueTier || company.revenue_tier || 'Not available'}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Funding Stage</h4>
                  <div className="text-sm text-gray-700">{company.fundingStage || 'Not available'}</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Investors</h4>
                <div className="text-sm text-gray-700">{company.investors || 'Not available'}</div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Legal Structure</h4>
                <div className="text-sm text-gray-700">{company.legalStructure || 'Not available'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Leadership/Founders Card */}
      {(company.foundersAndLeadership || company.founders_and_leadership) && (
        <Card className="border border-gray-200 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Users className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
              <CardTitle className="text-base font-medium text-gray-800">Leadership</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-700">{company.foundersAndLeadership || company.founders_and_leadership}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Certifications Card */}
      {company.certifications_compliance && (
        <Card className="border border-gray-200 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Award className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
              <CardTitle className="text-base font-medium text-gray-800">Certifications & Compliance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-700">{company.certifications_compliance}</p>
          </CardContent>
        </Card>
      )}
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
        
        <Button size="sm" variant="default" onClick={() => setOpenUserModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {usersLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
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
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{new Date(user.joinedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {userSearchQuery ? (
                        <div className="text-muted-foreground text-sm">
                          No users found matching "{userSearchQuery}"
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">
                          No users added to this company yet
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      <InviteModal 
        variant="user"
        open={openUserModal} 
        onOpenChange={(open) => setOpenUserModal(open)}
        companyId={parseInt(companyId || "0")}
        companyName={company.name}
      />
    </div>
  );

  const renderRiskTab = () => (
    <div className="space-y-6">
      {/* Risk Factors Summary Card - Combined with risk score and accreditation status */}
      <Card className="border border-gray-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <FileText className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
            <CardTitle className="text-base font-medium text-gray-800">Risk Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4">
            {/* Top row with Risk Score and Accreditation Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Risk Score */}
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3.5 w-3.5 text-gray-500" />
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Score</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-medium text-gray-800">
                      {company.riskScore || company.risk_score || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      No Risk
                    </div>
                  </div>
                  {(company.category === "Bank" || company.category === "Invela") && (
                    <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                      As a regulatory institution, you may adjust this risk score
                    </div>
                  )}
                </div>
              </div>
              
              {/* Accreditation Status */}
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-gray-500" />
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Accreditation Status</div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(company.accreditationStatus || company.accreditation_status)}
                </div>
              </div>
            </div>
            
            {/* Risk Factors Rows */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Company Age</div>
                <div className="text-sm text-gray-800">{companyAge ? `${companyAge} years` : 'Not available'}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Market Presence</div>
                <div className="text-sm text-gray-800">{company.category || 'Not available'}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Employee Count</div>
                <div className="text-sm text-gray-800">{company.numEmployees || 'Not available'}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Legal Structure</div>
                <div className="text-sm text-gray-800">{company.legalStructure || 'Not available'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Risk Dimensions Grid */}
      <Card className="border border-gray-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <AlertCircle className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
            <CardTitle className="text-base font-medium text-gray-800">Risk Dimensions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {company.risk_clusters && Object.entries(company.risk_clusters)
              .filter(([key]) => {
                // Only show the new risk dimensions
                const newDimensions = [
                  'Cyber Security', 'Financial Stability', 'Potential Liability',
                  'Dark Web Data', 'Public Sentiment', 'Data Access Scope'
                ];
                return newDimensions.includes(key);
              })
              .map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                    {key}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      value > 66 ? 'bg-red-500' : 
                      value > 33 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}></div>
                    <span className="text-sm text-gray-800">{value}/100</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Risk Radar Chart */}
      <Card className="border border-gray-200 shadow-none overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <Target className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
            <CardTitle className="text-base font-medium text-gray-800">Risk Radar Visualization</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-8">
          {company.id ? (
            <div className="w-full aspect-[2.5/1.5] max-w-[900px] mx-auto">
              <RiskRadarChart 
                companyId={company.id}
                showDropdown={false}
                className="shadow-none border-none"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-sm text-gray-500">No data available</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  console.log("[CompanyProfile] Rendering main content with activeTab:", activeTab);
  console.log("[CompanyProfile] About to render with company data:", {
    hasCompany: !!company,
    companyName: company?.name,
    companyId: company?.id,
    activeTab,
    timestamp: new Date().toISOString()
  });
  
  try {
    return (
      <DashboardLayout>
        <PageTemplate>
          <TutorialManager tabName="company-profile">
            <div className="space-y-6">
            {/* Breadcrumb navigation - using same pattern as claims tab */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground">
              <div className="relative w-4 h-4">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M2.3134 6.81482H4.54491V9.03704H2.3134V6.81482Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.7685 8C13.7685 11.191 11.1709 13.7778 7.96656 13.7778C5.11852 13.7778 2.74691 11.7323 2.25746 9.03704H0C0.510602 12.9654 3.88272 16 7.96656 16C12.4033 16 16 12.4183 16 8C16 3.58172 12.4033 0 7.96656 0C3.9342 0 0.595742 2.95856 0.0206721 6.81482H2.28637C2.83429 4.19289 5.17116 2.22222 7.96656 2.22222C11.1709 2.22222 13.7685 4.80902 13.7685 8Z" fill="currentColor"/>
                </svg>
              </div>
            </Link>
            <span>&gt;</span>
            <Link href="/network" className="hover:text-foreground hover:underline">Network</Link>
            <span>&gt;</span>
            <span className="font-semibold text-foreground">{company.name}</span>
          </div>

          {/* Back to Network button removed as requested */}
          
          {/* Company header with logo, title, and status boxes - neumorphic style */}
          <div className="bg-white rounded-lg p-5 mb-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-3">
                <CompanyLogo
                  companyId={company.id}
                  companyName={company.name}
                  size="lg"
                />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {company.category}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-5 flex-grow justify-end ml-auto">
                {/* S&P Data Access Risk Score Box - styled to match screenshot */}
                <div className="border rounded-lg flex flex-col h-20 px-6 min-w-[200px] relative overflow-hidden">
                  {/* Accent border - blue gradient */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-blue-300"></div>
                  
                  <div className="flex flex-col items-center justify-center h-full py-2">
                    <span className="text-xs font-medium text-center text-gray-500 uppercase tracking-wide mb-1">
                      S&P DATA ACCESS RISK SCORE
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
                      {company.riskScore || "29"}
                    </span>
                  </div>
                </div>
                
                {/* Accreditation Status Box - using unified component */}
                <AccreditationStatusDisplay 
                  company={company}
                  variant="box"
                  size="lg" 
                  className="min-w-[200px]"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-md overflow-hidden shadow-sm">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="flex h-12 border-b border-gray-200 w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="overview"
                  className="flex-1 rounded-none border-b-2 border-transparent py-3 font-medium text-gray-600 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="flex-1 rounded-none border-b-2 border-transparent py-3 font-medium text-gray-600 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
                >
                  Users
                </TabsTrigger>
                <TabsTrigger
                  value="risk"
                  className="flex-1 rounded-none border-b-2 border-transparent py-3 font-medium text-gray-600 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
                >
                  Risk
                </TabsTrigger>
              </TabsList>
              
              <div className="p-6">
                <TabsContent value="overview" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  {renderOverviewTab()}
                </TabsContent>
                <TabsContent value="users" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  {renderUsersTab()}
                </TabsContent>
                <TabsContent value="risk" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  {renderRiskTab()}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
        </TutorialManager>
      </PageTemplate>
    </DashboardLayout>
    );
  } catch (renderError) {
    console.error("[CompanyProfile] Rendering error:", renderError);
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Rendering Error</h2>
            <p className="text-gray-600 max-w-md">
              There was an error displaying this company profile. Error: {renderError instanceof Error ? renderError.message : 'Unknown error'}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }
}