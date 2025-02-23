import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Globe, Users } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface CompanyProfileData {
  id: number;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  numEmployees: string | null;
  incorporationYear: number | null;
}

export default function CompanyProfilePage() {
  const params = useParams();
  const companyId = params.companySlug;

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

  return (
    <DashboardLayout>
      <PageTemplate
        showBreadcrumbs
        headerActions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Network
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 rounded-lg shadow-lg">
              <CompanyLogo companyId={company.id} companyName={company.name} size="lg" />
            </div>
            <PageHeader
              title={company.name}
              description={company.description || "No description available"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <div className="text-sm font-medium text-muted-foreground">Employees</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{company.numEmployees || 'Not available'}</span>
                  </div>
                </div>

                {companyAge !== null && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Company Age</div>
                    <span>{companyAge} years</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}