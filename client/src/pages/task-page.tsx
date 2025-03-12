import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CardMethodChoice } from "@/components/card/CardMethodChoice";
import { PageTemplate } from "@/components/ui/page-template";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";

interface TaskPageProps {
  params: {
    taskSlug: string;
  }
}

export default function TaskPage({ params: pageParams }: TaskPageProps) {
  const [, navigate] = useLocation();
  const [match] = useRoute("/task-center/task/:taskSlug");
  const [questMatch] = useRoute("/task-center/task/:taskSlug/questionnaire"); // Match any taskSlug with questionnaire

  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);

  // Parse the taskSlug to get task type and company name
  const [taskType, ...companyNameParts] = pageParams.taskSlug.split('-');
  const companyName = companyNameParts.join('-');

  console.log('[TaskPage] Route debugging:', {
    taskSlug: pageParams.taskSlug,
    taskType,
    companyName,
    match,
    questMatch,
    timestamp: new Date().toISOString()
  });

  const apiEndpoint = taskType === 'kyb' ? '/api/tasks/kyb' : '/api/tasks/card';

  const { data: task, isLoading, error } = useQuery({
    queryKey: [apiEndpoint, companyName],
    queryFn: async () => {
      console.log('[TaskPage] Fetching task data:', {
        endpoint: apiEndpoint,
        companyName,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`${apiEndpoint}/${companyName}`);

      if (!response.ok) {
        throw new Error('Failed to load task');
      }

      const data = await response.json();
      console.log('[TaskPage] Task data received:', {
        taskId: data.id,
        taskType: data.task_type,
        status: data.status,
        metadata: data.metadata,
        timestamp: new Date().toISOString()
      });

      return data;
    },
    enabled: !!companyName
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load task. Please try again.",
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground">
              Could not find the task for {companyName}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const displayName = task.metadata?.company?.name || task.metadata?.companyName || companyName;

  console.log('[TaskPage] Rendering decision:', {
    taskType,
    questMatch,
    displayName,
    timestamp: new Date().toISOString()
  });

  if (taskType === 'card') {
    // If we're on the questionnaire route
    if (questMatch) {
      console.log('[TaskPage] Rendering CARD questionnaire form');
      return (
        <DashboardLayout>
          <div className="space-y-8">
            <PageHeader
              title={`CARD Form: ${displayName}`}
              description="Complete the Compliance and Risk Disclosure (CARD) form"
            />

            <div className="container max-w-7xl mx-auto">
              <CardFormPlayground 
                taskId={task.id}
                companyName={displayName}
                companyData={{
                  name: displayName,
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
          </div>
        </DashboardLayout>
      );
    }

    // Show method choice page for base route
    if (match) {
      console.log('[TaskPage] Rendering CARD method choice');
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
                  onClick={() => navigate('/task-center')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Task Center
                </Button>
              </div>
            </div>

            <CardMethodChoice
              taskId={task.id}
              companyName={displayName}
            />
          </PageTemplate>
        </DashboardLayout>
      );
    }
  }

  // KYB form rendering
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
              onClick={() => navigate('/task-center')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Task Center
            </Button>
          </div>
        </div>

        <div className="container max-w-7xl mx-auto">
          {taskType === 'kyb' && (
            <OnboardingKYBFormPlayground
              taskId={task.id}
              companyName={companyName}
              companyData={{
                name: displayName,
                description: task.metadata?.company?.description || ''
              }}
              savedFormData={task.savedFormData}
              onSubmit={(formData) => {
                toast({
                  title: "Success",
                  description: "KYB form has been submitted successfully.",
                  variant: "default",
                });
                navigate('/task-center');
              }}
            />
          )}
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}