import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { PageHeader } from "@/components/page-header";
import { PageTemplate } from "@/components/page-template";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";

export default function RiskScorePage() {
  return (
    <DashboardLayout>
      <PageTemplate
        showBreadcrumbs
      >
        <div className="space-y-6">
          <PageHeader
            title="S&P Risk Score"
            description="Track and analyze your organization's S&P risk assessment score."
            icon={<BarChart2 className="h-6 w-6 text-primary" />}
          />

          <Card className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Current Score</h2>
                <p className="text-muted-foreground">Last updated: April 25, 2025</p>
              </div>
              <div className="bg-primary/10 rounded-full p-8 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">89</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Historical Scores</CardTitle>
                <CardDescription>Score trending over time</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Risk Breakdown</CardTitle>
                <CardDescription>Score components by category</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Suggested actions to improve your risk score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}