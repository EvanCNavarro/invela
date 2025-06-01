import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, Globe, Users, Calendar } from "lucide-react";

interface CompanyData {
  id: number;
  name: string;
  description?: string;
  category: string;
  websiteUrl?: string;
  riskScore?: number;
  [key: string]: any;
}

export default function SimpleCompanyProfile() {
  const params = useParams();
  const companyId = params.companyId;
  const { user, isLoading: authLoading } = useAuth();

  const { data: company, isLoading, error } = useQuery<CompanyData>({
    queryKey: ['/api/companies', companyId],
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
          {/* Back button */}
          <Link href="/network">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Network
            </Button>
          </Link>

          {/* Company header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-gray-600 mt-1">{company.category}</p>
              {company.riskScore && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    Risk Score: {company.riskScore}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Company details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Name</label>
                  <p className="text-gray-900">{company.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900">{company.category}</p>
                </div>
                {company.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900">{company.description}</p>
                  </div>
                )}
                {company.websiteUrl && (
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Company Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.numEmployees && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Number of Employees</label>
                    <p className="text-gray-900">{company.numEmployees}</p>
                  </div>
                )}
                {company.incorporationYear && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Incorporation Year</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {company.incorporationYear}
                    </p>
                  </div>
                )}
                {company.riskScore && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Risk Assessment</label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{company.riskScore}</span>
                      <Badge variant={company.riskScore < 30 ? "default" : company.riskScore < 70 ? "secondary" : "destructive"}>
                        {company.riskScore < 30 ? "Low Risk" : company.riskScore < 70 ? "Medium Risk" : "High Risk"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional information */}
          {(company.productsServices || company.keyClientsPartners) && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.productsServices && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Products & Services</label>
                    <p className="text-gray-900">{company.productsServices}</p>
                  </div>
                )}
                {company.keyClientsPartners && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Key Clients & Partners</label>
                    <p className="text-gray-900">{company.keyClientsPartners}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}