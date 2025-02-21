import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageTemplate } from "@/components/ui/page-template";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";

interface TaskPageProps {
  params: {
    taskSlug: string;
  }
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  task_scope: string;
  status: string;
  priority: string;
  progress: number;
  metadata: {
    companyId?: number;
    companyName?: string;
    company?: any;
    [key: string]: any;
  } | null;
  savedFormData?: Record<string, any>;
}

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Parse the taskSlug to get task type and company name
  const [taskType, ...companyNameParts] = params.taskSlug.split('-');
  const companyName = companyNameParts.join('-');

  console.log('[TaskPage] Initializing with params:', {
    taskType,
    companyName,
    taskSlug: params.taskSlug
  });

  // Only fetch if it's a KYB task
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks/kyb', companyName],
    queryFn: async () => {
      console.log('[TaskPage] Fetching KYB task for company:', companyName);
      const response = await fetch(`/api/tasks/kyb/${companyName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch KYB task');
      }
      const data = await response.json();
      console.log('[TaskPage] Task data loaded:', {
        taskId: data.id,
        status: data.status,
        currentProgress: data.progress,
        hasMetadata: !!data.metadata,
        hasSavedFormData: !!data.savedFormData,
        metadataKeys: Object.keys(data.metadata || {}),
        savedFormDataKeys: Object.keys(data.savedFormData || {}),
        formFieldsPopulated: Object.entries(data.savedFormData || {})
          .filter(([key, value]) => !!value)
          .map(([key]) => key)
      });
      return data;
    },
    enabled: taskType === 'kyb',
    // Force a fresh fetch when re-entering the form
    staleTime: 0,
    cacheTime: 0
  });

  useEffect(() => {
    if (error) {
      console.error('[TaskPage] Error loading task:', error);
      toast({
        title: "Error",
        description: "Failed to load KYB task. Please try again.",
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast]);

  const handleBackClick = () => {
    window.history.back();
  };

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
    console.log('[TaskPage] No task found for:', companyName);
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground">
              Could not find the KYB task for {companyName}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Currently only supporting KYB tasks
  if (taskType !== 'kyb') {
    console.log('[TaskPage] Unsupported task type:', taskType);
    navigate('/task-center');
    return null;
  }

  // Get the company data from the task metadata
  const companyData = task.metadata?.company || {
    name: task.metadata?.companyName || companyName,
    description: task.metadata?.description,
  };

  console.log('[TaskPage] Rendering KYB form with data:', {
    taskId: task.id,
    companyName,
    hasCompanyData: !!companyData,
    hasSavedFormData: !!task.metadata,
    metadataKeys: Object.keys(task.metadata || {}),
    currentProgress: task.progress,
    currentStatus: task.status
  });

  return (
    <DashboardLayout>
      <PageTemplate className="space-y-6">
        <div className="space-y-4">
          <BreadcrumbNav forceFallback={true} />
          <Button
            variant="outline"
            size="sm"
            className="text-sm font-medium bg-white border-muted-foreground/20"
            onClick={handleBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Task Center
          </Button>
        </div>

        <div className="container max-w-7xl mx-auto">
          <OnboardingKYBFormPlayground
            taskId={task.id}
            companyName={companyName}
            companyData={companyData}
            savedFormData={task.metadata}
            onSubmit={(formData) => {
              console.log('[TaskPage] Form submission initiated:', {
                taskId: task.id,
                currentProgress: task.progress,
                formDataKeys: Object.keys(formData),
                populatedFields: Object.entries(formData)
                  .filter(([_, value]) => !!value)
                  .map(([key]) => key)
              });

              fetch('/api/kyb/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileName: `kyb_${companyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                  formData,
                  taskId: task.id
                })
              })
                .then(response => {
                  if (!response.ok) throw new Error('Failed to save KYB form');
                  return response.json();
                })
                .then((result) => {
                  console.log('[TaskPage] Form submission successful:', {
                    taskId: task.id,
                    savedProgress: result.progress,
                    newStatus: result.status,
                    timestamp: new Date().toISOString()
                  });
                  toast({
                    title: "KYB Form Submitted",
                    description: "Your KYB form has been saved and the task has been updated.",
                  });
                  navigate('/task-center');
                })
                .catch(error => {
                  console.error('[TaskPage] Form submission failed:', error);
                  toast({
                    title: "Error",
                    description: "Failed to save KYB form. Please try again.",
                    variant: "destructive",
                  });
                });
            }}
          />
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}