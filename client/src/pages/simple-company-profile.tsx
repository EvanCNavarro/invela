import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ArrowLeft, Globe, Users, Calendar, Shield, User, Target, TrendingUp } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";

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

export default function SimpleCompanyProfile() {
  const params = useParams();
  const companyId = params.companyId;
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isLoading: authLoading } = useAuth();

  const { data: company, isLoading, error } = useQuery<CompanyData>({
    queryKey: [`/api/companies/${companyId}/profile`],
    enabled: !!companyId && !authLoading,
  });

  // Fetch accreditation data from separate endpoint like dashboard does
  const { data: accreditationData } = useQuery<AccreditationData>({
    queryKey: [`/api/companies/${companyId}/accreditation`],
    enabled: !!companyId && !authLoading,
  });

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
              
              <div className="flex gap-5 flex-grow justify-end ml-auto">
                {/* S&P DARS Risk Score Box */}
                <div className="border rounded-lg flex flex-col h-20 px-6 min-w-[200px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-blue-300"></div>
                  <div className="flex flex-col items-center justify-center h-full py-2">
                    <span className="text-xs font-medium text-center text-gray-500 uppercase tracking-wide mb-1">
                      S&P DARS
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
                      {company?.risk_score || company?.riskScore || company?.chosen_score || "0"}
                    </span>
                  </div>
                </div>

                {/* Accreditation Status Box */}
                <div className="border rounded-lg flex flex-col h-20 px-6 min-w-[200px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-600 to-green-300"></div>
                  <div className="flex flex-col items-center justify-center h-full py-2">
                    <span className="text-xs font-medium text-center text-gray-500 uppercase tracking-wide mb-1">
                      ACCREDITATION
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
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
                  <div className="space-y-6">
                    {/* Company Header Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <CompanyLogo
                            companyId={company?.id}
                            companyName={company?.name}
                            size="xl"
                          />
                        </div>
                        <div className="flex-grow">
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">{company?.name}</h2>
                          <p className="text-lg text-gray-600 mb-3">{company?.category}</p>
                          {company?.description && (
                            <p className="text-gray-700 leading-relaxed">{company.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {company?.risk_score || company?.riskScore || company?.chosen_score || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">Risk Score</div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {accreditationData?.status === 'ACTIVE' ? 'APPROVED' : (company?.accreditation_status || 'PENDING')}
                        </div>
                        <div className="text-sm text-gray-500">Accreditation</div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {company?.numEmployees || company?.employee_count || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">Employees</div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {company?.incorporationYear || company?.founded_year || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">Founded</div>
                      </div>
                    </div>

                    {/* Detailed Information Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Company Details */}
                      <Card className="h-fit">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            Company Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Legal Name</label>
                              <p className="text-gray-900 font-medium">{company?.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Industry</label>
                              <p className="text-gray-900">{company?.category}</p>
                            </div>
                            {company?.websiteUrl && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Website</label>
                                <a 
                                  href={company.websiteUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Globe className="w-4 h-4" />
                                  {company.websiteUrl}
                                </a>
                              </div>
                            )}
                            {company?.phone && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Phone</label>
                                <p className="text-gray-900">{company.phone}</p>
                              </div>
                            )}
                            {company?.address && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Address</label>
                                <p className="text-gray-900">{company.address}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Business Information */}
                      <Card className="h-fit">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="w-5 h-5 text-green-600" />
                            Business Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-3">
                            {(company?.incorporationYear || company?.founded_year) && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Founded</label>
                                <p className="text-gray-900 flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {company.incorporationYear || company.founded_year}
                                </p>
                              </div>
                            )}
                            {(company?.numEmployees || company?.employee_count) && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Number of Employees</label>
                                <p className="text-gray-900">{company.numEmployees || company.employee_count}</p>
                              </div>
                            )}
                            {company?.revenue_tier && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Revenue Category</label>
                                <p className="text-gray-900">{company.revenue_tier}</p>
                              </div>
                            )}
                            {company?.business_model && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Business Model</label>
                                <p className="text-gray-900">{company.business_model}</p>
                              </div>
                            )}
                            {company?.target_market && (
                              <div>
                                <label className="text-sm font-medium text-gray-500">Target Market</label>
                                <p className="text-gray-900">{company.target_market}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Services and Partnerships */}
                    {(company?.productsServices || company?.keyClientsPartners || company?.services_offered) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Products & Services
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {(company?.productsServices || company?.services_offered) && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Products & Services</label>
                              <p className="text-gray-900 leading-relaxed">{company.productsServices || company.services_offered}</p>
                            </div>
                          )}
                          {company?.keyClientsPartners && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Key Clients & Partners</label>
                              <p className="text-gray-900 leading-relaxed">{company.keyClientsPartners}</p>
                            </div>
                          )}
                          {company?.compliance_certifications && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Compliance & Certifications</label>
                              <p className="text-gray-900 leading-relaxed">{company.compliance_certifications}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="users" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Company Users
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">User management functionality for {company?.name || 'this company'} would be displayed here.</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="risk" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="space-y-6">
                    {/* Risk Score Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Risk Score Overview - {company?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="text-center">
                            <div className="text-6xl font-bold text-gray-900 mb-2">
                              {company?.risk_score || company?.riskScore || company?.chosen_score || 0}
                            </div>
                            <p className="text-sm text-gray-500 mb-3">S&P DARS Risk Score</p>
                            <Badge variant={
                              (company?.risk_score || company?.riskScore || company?.chosen_score || 0) < 30 ? "default" : 
                              (company?.risk_score || company?.riskScore || company?.chosen_score || 0) < 70 ? "secondary" : 
                              "destructive"
                            }>
                              {(company?.risk_score || company?.riskScore || company?.chosen_score || 0) < 30 ? "Low Risk" : 
                               (company?.risk_score || company?.riskScore || company?.chosen_score || 0) < 70 ? "Medium Risk" : 
                               "High Risk"}
                            </Badge>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Company</label>
                              <p className="text-lg font-semibold text-gray-900">{company?.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Category</label>
                              <p className="text-gray-900">{company?.category}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Assessment Status</label>
                              <Badge variant="outline" className="text-green-700 border-green-300">
                                Current Assessment
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Risk Radar Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Risk Radar Analysis - {company?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 pb-8">
                        {company?.id ? (
                          <div className="w-full aspect-[2.5/1.5] max-w-[900px] mx-auto">
                            <RiskRadarChart 
                              companyId={company.id}
                              showDropdown={false}
                              className="shadow-none border-none"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-[300px]">
                            <div className="text-sm text-gray-500">Loading risk analysis...</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Risk Dimensions Detail */}
                    {company?.risk_clusters && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Risk Dimensions Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(company.risk_clusters)
                              .filter(([key]) => {
                                // Show the six main risk dimensions
                                const mainDimensions = [
                                  'Cyber Security', 'Financial Stability', 'Potential Liability',
                                  'Dark Web Data', 'Public Sentiment', 'Data Access Scope'
                                ];
                                return mainDimensions.includes(key);
                              })
                              .map(([key, value]) => (
                                <div key={key} className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium text-gray-700">{key}</div>
                                    <div className={`w-3 h-3 rounded-full ${
                                      value > 66 ? 'bg-red-500' : 
                                      value > 33 ? 'bg-yellow-500' : 
                                      'bg-green-500'
                                    }`}></div>
                                  </div>
                                  <div className="text-2xl font-bold text-gray-900 mb-1">{value}/100</div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        value > 66 ? 'bg-red-500' : 
                                        value > 33 ? 'bg-yellow-500' : 
                                        'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.min(value, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
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