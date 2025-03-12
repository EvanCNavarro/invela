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
  const [match, matchParams] = useRoute("/task-center/task/:taskSlug");
  const [questMatch, questParams] = useRoute("/task-center/task/:taskSlug/questionnaire"); // Match any taskSlug with questionnaire
  
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
    match: !!match,
    questMatch: !!questMatch,
    path: window.location.pathname,
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

  if (taskType === 'card') {
    // If we're on the questionnaire route
    if (questMatch || window.location.pathname.includes('/questionnaire')) {
      console.log('[TaskPage] Rendering CARD questionnaire form', {
        match: !!match,
        questMatch: !!questMatch,
        path: window.location.pathname,
        taskId: task?.id,
        displayName
      });
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
import { useParams, useLocation } from "wouter";
import { useEffect } from "react";

export default function TaskPage() {
  const params = useParams();
  const [location] = useLocation();
  
  useEffect(() => {
    console.log('[TaskPage] Route debugging:', {
      taskSlug: params.taskSlug,
      taskType: params.taskSlug?.split('-')[0],
      companyName: params.taskSlug?.split('-')[1],
      match: location.includes(params.taskSlug || ''),
      questMatch: location.includes('questionnaire'),
      timestamp: new Date().toISOString()
    });
  }, [params, location]);
  
  return (
    <div>
      <h1>Task Page Router</h1>
      <p>This is a debugging page for task routing.</p>
      <pre>{JSON.stringify(params, null, 2)}</pre>
    </div>
  );
}
