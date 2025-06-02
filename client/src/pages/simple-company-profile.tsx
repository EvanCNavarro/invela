import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Building2, ArrowLeft, Globe, Users, Calendar, Shield, User, Target, TrendingUp, Search as SearchIcon, X } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";
import Fuse from 'fuse.js';

interface CompanyData {
  id: number;
  name: string;
  description?: string;
  category: string;
  websiteUrl?: string;
  riskScore?: number;
  [key: string]: any;
}

interface AccreditationData {
  id: number;
  accreditationNumber: number;
  issuedDate: string;
  expiresDate: string | null;
  status: string;
  daysUntilExpiration: number | null;
  isPermanent: boolean;
}

interface UserData {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_demo: boolean;
}

export default function SimpleCompanyProfile() {
  const params = useParams();
  const companyId = params.companyId;
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isLoading: authLoading } = useAuth();

  const { data: company, isLoading, error } = useQuery<CompanyData>({
    queryKey: [`/api/companies/${companyId}/profile`],
    enabled: !!companyId && !authLoading,
  });

  // Debug logging after data is received
  if (company) {
    console.log('[Company Profile Debug] Received company data:', company);
    console.log('[Company Profile Debug] Business fields check:', {
      products_services: company?.products_services,
      market_position: company?.market_position,
      founders_and_leadership: company?.founders_and_leadership,
      key_clients_partners: company?.key_clients_partners,
      investors: company?.investors,
      funding_stage: company?.funding_stage,
      certifications_compliance: company?.certifications_compliance
    });
  }

  if (error) {
    console.error('[Company Profile Debug] Error fetching company:', error);
  }

  // Fetch accreditation data from separate endpoint like dashboard does
  const { data: accreditationData } = useQuery<AccreditationData>({
    queryKey: [`/api/companies/${companyId}/accreditation`],
    enabled: !!companyId && !authLoading,
  });

  // Fetch users associated with this company
  const { data: users, isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: [`/api/companies/${companyId}/users`],
    enabled: !!companyId && !authLoading && activeTab === "users",
  });

  // Initialize Fuse instance for fuzzy search on users
  const fuse = useMemo(() => new Fuse(users || [], {
    keys: ['full_name', 'email'],
    threshold: 0.3,
    includeMatches: true,
  }), [users]);

  // Filter users using fuzzy search
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    
    const fuseResults = fuse.search(searchTerm);
    return fuseResults.map(result => result.item);
  }, [users, searchTerm, fuse]);

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">Company Not Found</h2>
            <Link href="/network">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Network
              </Button>
            </Link>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTemplate>
        <div className="space-y-6">
          {/* Breadcrumb navigation */}
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
            <span className="font-semibold text-foreground">{company?.name || 'Loading...'}</span>
          </div>

          {/* Company header with logo, title, and status boxes */}
          <div className="bg-white rounded-lg p-5 mb-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-3">
                <CompanyLogo
                  companyId={company?.id}
                  companyName={company?.name}
                  size="lg"
                />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{company?.name || 'Loading...'}</h1>
                  <p className="text-sm text-muted-foreground">
                    {company?.category || 'Loading...'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 flex-grow justify-end ml-auto">
                {/* S&P DARS Risk Score Box */}
                <div className="border rounded-lg flex flex-col h-18 px-5 min-w-[180px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-blue-300"></div>
                  <div className="flex flex-col items-center justify-center h-full py-2">
                    <span className="text-xs font-medium text-center text-gray-500 uppercase tracking-wide mb-1">
                      S&P DARS
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {company?.risk_score || company?.riskScore || company?.chosen_score || "0"}
                    </span>
                  </div>
                </div>

                {/* Accreditation Status Box */}
                <div className="border rounded-lg flex flex-col h-18 px-5 min-w-[180px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-600 to-green-300"></div>
                  <div className="flex flex-col items-center justify-center h-full py-2">
                    <span className="text-xs font-medium text-center text-gray-500 uppercase tracking-wide mb-1">
                      ACCREDITATION
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {accreditationData?.status === 'ACTIVE' ? 'APPROVED' : (company?.accreditation_status || 'PENDING')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="risk" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Risk
              </TabsTrigger>
            </TabsList>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-6">
                <TabsContent value="overview" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">


                    {/* Essential Details */}
                    <Card className="lg:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                          <Building2 className="w-4 h-4 text-gray-600" />
                          Essential Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500">Legal Name</label>
                            <p className="text-sm text-gray-900">{company?.name}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">Industry</label>
                            <p className="text-sm text-gray-900">{company?.category}</p>
                          </div>
                          {company?.description && (
                            <div className="lg:col-span-2">
                              <label className="text-xs font-medium text-gray-500">Description</label>
                              <p className="text-sm text-gray-900 leading-relaxed">{company.description}</p>
                            </div>
                          )}
                          {(company?.incorporation_year || company?.incorporationYear) && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">Founded</label>
                              <p className="text-sm text-gray-900">{company.incorporation_year || company.incorporationYear}</p>
                            </div>
                          )}
                          {company?.legal_structure && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">Legal Structure</label>
                              <p className="text-sm text-gray-900">{company.legal_structure}</p>
                            </div>
                          )}
                          {company?.hq_address && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">Headquarters</label>
                              <p className="text-sm text-gray-900">{company.hq_address}</p>
                            </div>
                          )}
                          {company?.website_url && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Website</label>
                              <a 
                                href={company.website_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-900 hover:text-gray-700 flex items-center gap-1"
                              >
                                <Globe className="w-4 h-4 text-gray-600" />
                                {company.website_url}
                              </a>
                            </div>
                          )}
                          {company?.num_employees && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Employees</label>
                              <p className="text-gray-900">{company.num_employees}</p>
                            </div>
                          )}
                          {company?.revenue_tier && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Revenue Tier</label>
                              <p className="text-gray-900 capitalize">{company.revenue_tier}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Business Information */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                          <Users className="w-4 h-4 text-gray-600" />
                          Business Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {company?.products_services && (
                          <div>
                            <label className="text-xs font-medium text-gray-500">Products & Services</label>
                            <p className="text-sm text-gray-900 leading-relaxed">{company.products_services}</p>
                          </div>
                        )}
                        {company?.market_position && (
                          <div>
                            <label className="text-xs font-medium text-gray-500">Market Position</label>
                            <p className="text-sm text-gray-900 capitalize">{company.market_position}</p>
                          </div>
                        )}
                        {company?.founders_and_leadership && (
                          <div>
                            <label className="text-xs font-medium text-gray-500">Leadership</label>
                            <p className="text-sm text-gray-900 leading-relaxed">{company.founders_and_leadership}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Partnerships & Funding */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                          <TrendingUp className="w-4 h-4 text-gray-600" />
                          Partnerships & Funding
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {company?.key_clients_partners && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Key Clients & Partners</label>
                            <p className="text-gray-900 leading-relaxed">{company.key_clients_partners}</p>
                          </div>
                        )}
                        {company?.investors && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Investors</label>
                            <p className="text-gray-900 leading-relaxed">{company.investors}</p>
                          </div>
                        )}
                        {company?.funding_stage && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Funding Stage</label>
                            <p className="text-gray-900">{company.funding_stage}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Compliance & Certifications */}
                    {company?.certifications_compliance && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                            <Shield className="w-5 h-5 text-gray-600" />
                            Compliance & Certifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Certifications</label>
                            <p className="text-gray-900 leading-relaxed">{company.certifications_compliance}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>



                <TabsContent value="risk" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="min-h-[800px]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Risk Assessment Overview */}
                    <Card className="lg:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                          <TrendingUp className="w-4 h-4 text-gray-600" />
                          Risk Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500">S&P DARS Risk Score</label>
                            <p className="text-sm text-gray-900">
                              {company?.risk_score || company?.riskScore || company?.chosen_score || 0}/100
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">Risk Level</label>
                            <p className="text-sm text-gray-900">
                              {(company?.risk_score || company?.riskScore || company?.chosen_score || 0) < 30 ? "Low Risk" : 
                               (company?.risk_score || company?.riskScore || company?.chosen_score || 0) < 70 ? "Medium Risk" : 
                               "High Risk"}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">Assessment Status</label>
                            <p className="text-sm text-gray-900">Current Assessment</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">Category</label>
                            <p className="text-sm text-gray-900">{company?.category}</p>
                          </div>
                        </div>
                        {company?.risk_clusters && (
                          <div className="mt-6 pt-4 border-t border-gray-100">
                            <label className="text-xs font-medium text-gray-500 mb-3 block">Risk Dimensions</label>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                              {Object.entries(company.risk_clusters)
                                .filter(([key]) => {
                                  const mainDimensions = [
                                    'Cyber Security', 'Financial Stability', 'Potential Liability',
                                    'Dark Web Data', 'Public Sentiment', 'Data Access Scope'
                                  ];
                                  return mainDimensions.includes(key);
                                })
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-xs text-gray-500">{key}:</span> <span className="text-sm text-gray-900">{value as number}/100</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Risk Radar Chart */}
                    <Card className="lg:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                          <Target className="w-4 h-4 text-gray-600" />
                          Risk Radar Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 pb-6">
                        <div className="w-full max-w-[1000px] mx-auto">
                          <div className="h-[400px] w-full">
                            {company?.id ? (
                              <RiskRadarChart 
                                companyId={company.id}
                                showDropdown={false}
                                className="shadow-none border-none w-full h-full"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <div className="text-sm text-gray-500">Loading risk analysis...</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-6">
                  <div className="bg-white rounded-lg border">
                    {/* Search and Filters */}
                    <div className="px-6 py-4 border-b bg-gray-50/50">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users by name or email..."
                            className="pl-9 pr-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          {searchTerm && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
                              onClick={() => setSearchTerm("")}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                      {usersLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-sm text-muted-foreground">Loading users...</div>
                        </div>
                      ) : filteredUsers.length > 0 ? (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Name
                              </th>
                              <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Email
                              </th>
                              <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Account Type
                              </th>
                              <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Created
                              </th>
                              <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Last Updated
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((user) => (
                              <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                                <td className="py-3 px-6">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                      <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{user.full_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-6">
                                  <span className="text-sm text-gray-700">{user.email}</span>
                                </td>
                                <td className="py-3 px-6">
                                  <Badge variant={user.is_demo ? "secondary" : "default"} className="text-xs">
                                    {user.is_demo ? "Demo" : "Standard"}
                                  </Badge>
                                </td>
                                <td className="py-3 px-6">
                                  <span className="text-sm text-gray-700">
                                    {new Date(user.created_at).toLocaleDateString()}
                                  </span>
                                </td>
                                <td className="py-3 px-6">
                                  <span className="text-sm text-gray-700">
                                    {new Date(user.updated_at).toLocaleDateString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                          <User className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {searchTerm ? "No users found matching your search" : "No users found for this company"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer with result count */}
                    {users && users.length > 0 && (
                      <div className="px-6 py-3 border-t bg-gray-50/50">
                        <div className="text-xs text-muted-foreground">
                          {searchTerm 
                            ? `Showing ${filteredUsers.length} of ${users.length} users`
                            : `${users.length} total users`
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}