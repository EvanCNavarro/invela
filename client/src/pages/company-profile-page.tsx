import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { ArrowLeft, Building2, Shield, Calendar, Users, FileText, AlertTriangle } from "lucide-react";
import type { Company } from "@/types/company";
import { cn } from "@/lib/utils";
import defaultCompanyLogo from "@/assets/default-company-logo.svg";

// Helper function to generate consistent slugs
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function CompanyProfilePage() {
  const { companySlug } = useParams();

  // Query for all companies
  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  console.log('Debug - Company Slug:', companySlug);
  console.log('Debug - Available Companies:', companies);

  // Find the company that matches the slug
  const company = companies.find(c => {
    const genSlug = generateSlug(c.name);
    console.log('Debug - Comparing:', genSlug, 'with', companySlug);
    return genSlug === companySlug;
  });

  console.log('Debug - Found Company:', company);

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

  if (!company) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Company Not Found</h2>
          <p className="text-muted-foreground max-w-md text-center">
            The company you're looking for doesn't exist or you don't have permission to view it.
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
                    src={`/api/companies/${company.id}/logo`}
                    alt={`${company.name} logo`}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultCompanyLogo;
                    }}
                  />
                </div>
                {company.name}
              </div>
            }
            description={company.description || "No description available"}
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
              <div className="text-2xl font-semibold">{company.type?.replace(/_/g, ' ') || 'N/A'}</div>
              <p className="text-sm text-muted-foreground mt-1">{company.category || 'N/A'}</p>
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
              <p className="text-sm text-muted-foreground mt-3">
                Last updated: {new Date(company.updatedAt || Date.now()).toLocaleDateString()}
              </p>
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
                <Users className="h-4 w-4 text-muted-foreground" />
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
                <FileText className="h-4 w-4 text-muted-foreground" />
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
    </DashboardLayout>
  );
}