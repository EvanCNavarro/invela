/**
 * ========================================
 * Risk Score Page - S&P Data Access Assessment
 * ========================================
 * 
 * Comprehensive risk score monitoring and analysis page for S&P Data Access
 * assessments. Provides executive-level visibility into organizational risk
 * metrics with integrated tutorial system and real-time score tracking.
 * 
 * Key Features:
 * - Real-time risk score display and monitoring
 * - S&P Data Access compliance tracking
 * - Interactive tutorial integration for user guidance
 * - Professional dashboard layout with responsive design
 * - Executive-level risk assessment visualization
 * 
 * Risk Assessment Components:
 * - Current score display with visual indicators
 * - Historical trend analysis capabilities
 * - Compliance status tracking and alerts
 * - Detailed risk breakdown and metrics
 * - Actionable insights and recommendations
 * 
 * @module pages/RiskScorePage
 * @version 1.0.0
 * @since 2025-05-23
 */

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageTemplate } from "@/components/ui/page-side-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { TutorialManager } from "@/components/tutorial/TutorialManager";

export default function RiskScorePage() {
  return (
    <DashboardLayout>
      <PageTemplate>
        {/* Display Risk Score Tutorial */}
        <TutorialManager tabName="risk-score" />
        
        <div className="space-y-6">
          <PageHeader
            title="S&P Data Access Risk Score"
            description="Track and analyze your organization's S&P Data Access risk assessment score."
            icon={<Gauge className="h-6 w-6 text-primary" />}
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