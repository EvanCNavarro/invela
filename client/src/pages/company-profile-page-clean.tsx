import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building2, Users, Shield } from "lucide-react";
import { Link } from "wouter";

interface CompanyProfileData {
  id: number;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  category: string;
  riskScore: number;
  [key: string]: any;
}

export default function CompanyProfilePage() {
  const params = useParams();
  const companyId = params.companyId;
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isLoading: authLoading } = useAuth();

  console.log("[CompanyProfile] Page loaded with companyId:", companyId);

  const { data: company, isLoading, error } = useQuery<CompanyProfileData>({
    queryKey: ['/api/companies', companyId],
    enabled: !!companyId && !authLoading,
  });

  console.log("[CompanyProfile] Query state:", { 
    companyId, 
    isLoading, 
    error: error?.message,
    hasCompany: !!company,
    companyName: company?.name 
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading company profile...</p>
            </div>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  if (error) {
    console.error("[CompanyProfile] Error loading company:", error);
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Error Loading Company</h2>
            <p className="text-gray-600 max-w-md">
              Unable to load company profile. Error: {error.message}
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  if (!company) {
    console.warn("[CompanyProfile] No company data found for ID:", companyId);
    return (
      <DashboardLayout>
        <PageTemplate>
          <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Company Not Found</h2>
            <p className="text-gray-600 max-w-md">
              The company profile you're looking for could not be found.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  console.log("[CompanyProfile] Rendering company profile for:", company.name);

  return (
    <DashboardLayout>
      <PageTemplate>
        <div className="space-y-6">
          {/* Breadcrumb navigation */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground">Dashboard</Link>
            <span>&gt;</span>
            <Link href="/network" className="hover:text-foreground hover:underline">Network</Link>
            <span>&gt;</span>
            <span className="font-semibold text-foreground">{company.name}</span>
          </div>

          {/* Company header */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-gray-900">{company.name}</h1>
                <p className="text-gray-600">{company.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className="text-2xl font-bold text-gray-900">{company.riskScore || 0}</p>
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
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="risk" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Risk Analysis
              </TabsTrigger>
            </TabsList>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-6">
                <TabsContent value="overview" className="m-0">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Company Name</label>
                          <p className="text-gray-900">{company.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Category</label>
                          <p className="text-gray-900">{company.category}</p>
                        </div>
                        {company.description && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <p className="text-gray-900">{company.description}</p>
                          </div>
                        )}
                        {company.websiteUrl && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Website</label>
                            <a 
                              href={company.websiteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {company.websiteUrl}
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="m-0">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Company Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600">User management functionality will be displayed here.</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="risk" className="m-0">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Risk Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{company.riskScore || 0}</p>
                            <p className="text-sm text-gray-500">Overall Risk Score</p>
                          </div>
                          <Badge variant="secondary">
                            {company.riskScore < 30 ? 'Low Risk' : company.riskScore < 70 ? 'Medium Risk' : 'High Risk'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
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