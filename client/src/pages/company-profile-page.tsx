import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { ArrowLeft, Building2, Globe, Users, DollarSign, Shield, Calendar } from "lucide-react";
import type { Company } from "@/types/company";
import { cn } from "@/lib/utils";
import defaultCompanyLogo from "@/assets/default-company-logo.svg";

export default function CompanyProfilePage() {
  const { companySlug } = useParams();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies", companySlug],
  });

  const getAccreditationBadgeVariant = (status: string) => {
    if (status === 'AWAITING_INVITATION' || status === 'SUSPENDED') return 'secondary';
    if (status === 'PENDING' || status === 'IN_REVIEW') return 'warning';
    if (status === 'APPROVED' || status === 'PROVISIONALLY_APPROVED') return 'success';
    if (status === 'REVOKED' || status === 'EXPIRED') return 'destructive';
    return 'secondary';
  };

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
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Company Not Found</h2>
          <p className="text-muted-foreground">The company you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title={
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border flex items-center justify-center bg-white">
                  <img
                    src={defaultCompanyLogo}
                    alt="Default company logo"
                    className="w-8 h-8 object-contain"
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

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Company Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{company.type.replace(/_/g, ' ')}</div>
              <p className="text-sm text-muted-foreground mt-1">{company.category}</p>
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
                variant="default"
                className={cn(
                  "text-sm capitalize",
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
                {company.accreditationStatus.replace(/_/g, ' ').toLowerCase()}
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
      </div>
    </DashboardLayout>
  );
}