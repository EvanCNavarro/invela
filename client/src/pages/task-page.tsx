import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
    company_name?: string;
    [key: string]: any;
  } | null;
}

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  console.log('[TaskPage] Rendering with params:', params);

  // Parse the taskSlug to get task type and company name
  const [taskType, ...companyNameParts] = params.taskSlug.split('-');
  const companyName = companyNameParts.join('-');

  console.log('[TaskPage] Parsed task info:', { taskType, companyName });

  // Only fetch if it's a KYB task
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks/kyb', companyName],
    enabled: taskType === 'kyb'
  });

  useEffect(() => {
    console.log('[TaskPage] Task data loaded:', {
      task,
      isLoading,
      error,
      taskType,
      companyName
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load KYB task. Please try again.",
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast, task, isLoading]);

  if (isLoading) {
    console.log('[TaskPage] Loading state');
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    console.log('[TaskPage] No task found');
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

  console.log('[TaskPage] Rendering KYB form with task:', task);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title={`KYB Form: ${task.metadata?.company_name || companyName}`}
          description="Complete the Know Your Business (KYB) verification form"
        />

        <div className="container max-w-7xl mx-auto">
          <OnboardingKYBFormPlayground 
            taskId={task.id}
            onSubmit={(formData) => {
              console.log('[TaskPage] Submitting KYB form:', formData);
              // Handle form submission
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
              .then(() => {
                toast({
                  title: "KYB Form Submitted",
                  description: "Your KYB form has been saved and the task has been updated.",
                });
                navigate('/task-center');
              })
              .catch(error => {
                console.error('Failed to save KYB form:', error);
                toast({
                  title: "Error",
                  description: "Failed to save KYB form. Please try again.",
                  variant: "destructive",
                });
              });
            }}
            companyName={task.metadata?.company_name}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}