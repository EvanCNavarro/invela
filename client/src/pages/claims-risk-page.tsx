import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-side-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BarChart3, FileText, PieChart } from "lucide-react";
import { TutorialManager } from "@/components/tutorial/TutorialManager";

export default function ClaimsRiskPage() {
  return (
    <DashboardLayout>
      <PageTemplate>
        {/* Display Claims Risk Tutorial */}
        <TutorialManager tabName="claims-risk" />
        
        <div className="space-y-6">
          <PageHeader
            title="Claims Risk Analysis"
            description="Analyze claims data to identify risk patterns and trends."
            icon={<FileText className="h-6 w-6 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-muted-foreground" />
                  Claims Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of claims by category
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-muted-foreground" />
                  Claim Types
                </CardTitle>
                <CardDescription>
                  Risk analysis by claim type
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-muted-foreground" />
                Temporal Analysis
              </CardTitle>
              <CardDescription>
                Claim patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}