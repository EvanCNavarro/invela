// Add debugging for params handling
console.log("[CardQuestionnairePage] Component imported");

// Track module dependency tree
console.log("[Module] Import trace:", {
  module: "card-questionnaire-page.tsx",
  imports: [
    "react",
    "wouter" 
    // List all actual imports here
  ],
  timestamp: new Date().toISOString()
});

// Verify dependencies are loaded
try {
  // Test critical dependencies
  const React = require('react');
  const Wouter = require('wouter');
  console.log("[CardQuestionnairePage] Dependencies verified:", {
    react: !!React,
    wouter: !!Wouter,
    timestamp: new Date().toISOString()
  });
} catch (error) {
  console.error("[CardQuestionnairePage] Import error:", error);
}

import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
// useLocation is already imported elsewhere in this file

import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageHeader } from "@/components/ui/page-header";

interface CardQuestionnairePageProps {
  params?: {
    companyName: string;
  };
}

export default function CardQuestionnairePage({ params: routeParams }: CardQuestionnairePageProps = {}) {
  const [, navigate] = useLocation();
  // Use the passed params if available, otherwise use useParams hook
  const hookParams = useParams<{companyName: string}>();
  const params = routeParams || hookParams;

  // Extract company name from URL pattern /task-center/task/card-:companyName/questionnaire
  const companyName = params.companyName;

  console.log('[CardQuestionnairePage] Initializing with params:', {
    companyName,
    rawParams: params,
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  // Ensure we have a valid company name before making the API call
  const { data: task, isLoading, error } = useQuery({
    queryKey: [`/api/tasks/card/${companyName}`],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!companyName, // Only run the query if companyName exists
  });

  useEffect(() => {
    console.log('[CardQuestionnairePage] Task data:', {
      taskId: task?.id,
      taskStatus: task?.status,
      timestamp: new Date().toISOString()
    });
  }, [task]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !task) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground">
              Could not find the CARD task for {companyName}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTemplate className="space-y-6">
        <div className="space-y-4">
          <BreadcrumbNav forceFallback={true} />
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              className="text-sm font-medium bg-white border-muted-foreground/20"
              onClick={() => navigate(`/task-center/task/card-${companyName}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Method Selection
            </Button>
          </div>
        </div>

        <PageHeader
          title={`CARD Questionnaire: ${task.metadata?.company_name || companyName}`}
          description="Complete the Compliance and Risk Disclosure (CARD) questionnaire"
        />

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Questionnaire</h2>
          <p className="text-muted-foreground mb-6">
            Please answer the following questions to complete your CARD assessment.
          </p>

          {/* Questionnaire form will be implemented here */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-muted-foreground">
                The questionnaire form implementation is in progress.
              </p>
            </div>
          </div>
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}