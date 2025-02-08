import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { ArrowLeft, Building2, Shield, Calendar, AlertTriangle, Ban } from "lucide-react";
import type { Company } from "@/types/company";
import { cn } from "@/lib/utils";
import defaultCompanyLogo from "@/assets/default-company-logo.svg";

// Helper function to generate consistent slugs
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function CompanyProfilePage() {
  const params = useParams();
  const companySlug = params.companySlug;

  // Query for all companies
  const { data: companiesData = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/companies"],
  });

  console.debug('Company Profile Debug:', {
    receivedSlug: companySlug,
    companiesDataLength: companiesData.length,
    rawCompaniesData: companiesData
  });

  // Find the company that matches the slug, accounting for nested structure
  const company = companiesData.find(item => {
    const companyData = item.companies || item;
    if (!companySlug || !companyData.name) return false;
    const generatedSlug = generateSlug(companyData.name);
    console.debug('Comparing slugs:', {
      companyName: companyData.name,
      generatedSlug,
      matchesTarget: generatedSlug === companySlug
    });
    return generatedSlug === companySlug;
  });

  const companyData = company?.companies || company;
  console.debug('Final matched company:', companyData);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-4 w-48 bg-muted rounded"></div>
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If no companies data is available, show access restricted error
  if (!companiesData || companiesData.length === 0) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  // If company not found in the network
  if (!companyData) {
    // Try to find the original company name from the slug for better error message
    const attemptedCompanyName = companySlug
      ?.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <PageHeader
            title={
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border flex items-center justify-center bg-white">
                  <img
                    src={`/api/companies/${companyData.id}/logo`}
                    alt={`${companyData.name} logo`}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultCompanyLogo;
                    }}
                  />
                </div>
                {companyData.name}
              </div>
            }
            description={companyData.description || "No description available"}
          />
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Network
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Company Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{companyData.type?.replace(/_/g, ' ') || 'N/A'}</div>
              <p className="text-sm text-muted-foreground mt-1">{companyData.category || 'N/A'}</p>
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
                  companyData.accreditationStatus === 'PENDING' && "bg-yellow-100 text-yellow-800",
                  companyData.accreditationStatus === 'IN_REVIEW' && "bg-yellow-100 text-yellow-800",
                  companyData.accreditationStatus === 'PROVISIONALLY_APPROVED' && "bg-green-100 text-green-800",
                  companyData.accreditationStatus === 'APPROVED' && "bg-green-100 text-green-800",
                  companyData.accreditationStatus === 'SUSPENDED' && "bg-gray-100 text-gray-800",
                  companyData.accreditationStatus === 'REVOKED' && "bg-red-100 text-red-800",
                  companyData.accreditationStatus === 'EXPIRED' && "bg-red-100 text-red-800",
                  companyData.accreditationStatus === 'AWAITING_INVITATION' && "bg-gray-100 text-gray-800"
                )}
              >
                {companyData.accreditationStatus?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
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
              <RiskMeter score={companyData.riskScore || 0} />
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Key Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companyData.contacts?.map((contact, index) => (
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
                <FileText className="h-4 w-4 text-muted-foreground" />
                Documents & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {companyData.documents?.map((doc, index) => (
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
    </DashboardLayout>
  );
}