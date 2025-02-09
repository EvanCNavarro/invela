import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { ArrowLeft, Building2, Shield, Calendar, AlertTriangle, Ban } from "lucide-react";
import type { Company } from "@/types/company";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/ui/company-logo";

// Helper function to generate consistent slugs
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

interface CompanyProfilePageProps {
  companySlug?: string;
}

export default function CompanyProfilePage({ companySlug }: CompanyProfilePageProps) {
  // Query for all companies
  const { data: companiesData = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Find the company that matches the slug
  const company = companiesData.find(item => {
    if (!companySlug || !item.name) return false;
    return generateSlug(item.name) === companySlug;
  });

  if (isLoading) {
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

  // If no companies data is available, show access restricted error
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

  // If company not found in the network
  if (!company) {
    // Try to find the original company name from the slug for better error message
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

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="space-y-8">
          {/* Back to Network button moved above company header */}
          <div className="flex items-center justify-start mb-6">
            <Button
              variant="secondary"
              size="sm"
              className="text-sm font-medium"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Network
            </Button>
          </div>

          {/* Company header section */}
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20">
              <CompanyLogo
                companyId={company.id}
                companyName={company.name}
                className="w-20 h-20 rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
              <p className="text-muted-foreground">{company.description || "No description available"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskMeter score={company.riskScore || 0} />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {/* Assuming Users icon is available */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H9m6 0a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Key Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {company.contacts?.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{contact.email}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground">No contacts available</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {/* Assuming FileText icon is available */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 0l-3-3m3 3l3-3m0 0V0M12 20M7 21H4a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2h-3" /></svg>
                  Documents & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {company.documents?.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium">{doc.name}</span>
                      <Badge variant={doc.status === 'verified' ? 'success' : 'warning'}>
                        {doc.status}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-muted-foreground">No documents available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}