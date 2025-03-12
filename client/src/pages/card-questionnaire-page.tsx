import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { PageTemplate } from "@/components/ui/page-template";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useQuery } from "@tanstack/react-query";

export default function CardQuestionnairePage() {
  const [, navigate] = useLocation();
  const params = useParams();
  const companyName = params.companyName;

  console.log('[CardQuestionnairePage] Initializing with params:', {
    companyName,
    timestamp: new Date().toISOString()
  });

  const { data: task, isLoading, error } = useQuery({
    queryKey: [`/api/tasks/card/${companyName}`],
    staleTime: 1000 * 60 * 5, // 5 minutes
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

        <div className="container max-w-7xl mx-auto">
          <CardFormPlayground 
            taskId={task.id}
            companyName={task.metadata?.company_name || companyName}
            companyData={{
              name: task.metadata?.company_name || companyName,
              description: task.description || undefined
            }}
            onSubmit={() => {
              toast({
                title: "CARD Form Submitted",
                description: "Your CARD form has been submitted successfully.",
              });
              navigate('/task-center');
            }}
          />
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}