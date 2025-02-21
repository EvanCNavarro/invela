import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

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

  // Parse the taskSlug to get task type and company name
  const [taskType, ...companyNameParts] = params.taskSlug.split('-');
  const companyName = companyNameParts.join('-');

  // Only fetch if it's a KYB task
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks/kyb', companyName],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/kyb/${companyName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch KYB task');
      }
      return response.json();
    },
    enabled: taskType === 'kyb'
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load KYB task. Please try again.",
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast]);

  if (isLoading) {
    return (
      <DashboardLayout activeTab="task-center">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    return (
      <DashboardLayout activeTab="task-center">
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
    navigate('/task-center');
    return null;
  }

  return (
    <DashboardLayout activeTab="task-center">
      <div className="space-y-8">
        <div className="container max-w-7xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/task-center">Task Center</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{task.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <PageHeader
          title={`KYB Form: ${task.metadata?.company_name || companyName}`}
          description="Complete the Know Your Business (KYB) verification form"
        />

        <div className="container max-w-7xl mx-auto">
          <OnboardingKYBFormPlayground 
            taskId={task.id}
            companyName={task.metadata?.company_name || companyName}
            onSubmit={(formData) => {
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
          />
        </div>
      </div>
    </DashboardLayout>
  );
}