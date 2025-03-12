import { useParams, useLocation, useRoute } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageTemplate } from "@/components/ui/page-template";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft } from "lucide-react";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { CardMethodChoice } from "@/components/card/CardMethodChoice";


import { useQuery } from "@tanstack/react-query";

interface TaskPageProps {
  params?: {
    taskSlug: string;
  }
}

export default function TaskPage({ params: pageParams }: TaskPageProps) {
  const params = useParams();
  const [location, navigate] = useLocation();
  const [match, matchParams] = useRoute("/task-center/task/:taskSlug");
  const [questMatch, questParams] = useRoute("/task-center/task/:taskSlug/questionnaire"); // Match any taskSlug with questionnaire

  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);

  // Parse the taskSlug to get task type and company name
  const taskSlug = pageParams?.taskSlug || params?.taskSlug || "";
  const taskParts = taskSlug.split('-');
  const taskType = taskParts[0];
  const companyName = taskParts.slice(1).join('-');

  // Debug route parsing
  const isQuestionnaire = location.endsWith('/questionnaire');
  // Removed automatic redirection

  console.log("[TaskPage] Route debugging:", {
    taskSlug,
    taskType,
    companyName,
    match: !!match,
    questMatch: !!questMatch,
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  console.log('[TaskPage] Questionnaire match check:', {
    questMatchResult: !!questMatch,
    questParams,
    path: window.location.pathname,
    pathParts: window.location.pathname.split('/'),
    timestamp: new Date().toISOString()
  });

  console.log('[TaskPage] Route matches:', {
    basicMatch: !!match,
    basicMatchParams: matchParams,
    questMatch: !!questMatch,
    questMatchParams: questParams,
    currentPath: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  // Redirection logic removed to allow choice page to display

  // Show CARD questionnaire for card task with questionnaire route
  if (questMatch && taskType === 'card') {
    const displayName = companyName;

    console.log('[TaskPage] Rendering CARD questionnaire');
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
            <CardFormPlayground 
              taskId={0} // Replace with actual task ID when available
              companyName={displayName}
              companyData={{
                name: displayName,
                description: "Company description" // Replace with actual description
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
      console.log('[TaskPage] API response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      });

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
    questMatch: !!questMatch,
    displayName,
    timestamp: new Date().toISOString()
  });

  // Show method choice page for base route
  if (match && taskType === 'card') {
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

  // KYB form rendering
  if (taskType === 'kyb') {
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
          </div>
        </PageTemplate>
      </DashboardLayout>
    );
  }

  // Fallback view - This should ideally never be reached if all cases are handled correctly
  return (
    <div>
      <h1>Task Page: {taskSlug}</h1>
      {/* Task content */}
    </div>
  );
}