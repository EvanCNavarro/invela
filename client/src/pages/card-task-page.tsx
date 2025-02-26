import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CardTaskPageProps {
  params: {
    slug: string;
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
    cardFormFile?: number; // File ID after submission
    [key: string]: any;
  } | null;
}

export default function CardTaskPage({ params }: CardTaskPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const companyName = params.slug.replace('card-', '');

  console.log('[CardTaskPage] Initializing with params:', {
    slug: params.slug,
    extractedCompanyName: companyName,
    timestamp: new Date().toISOString()
  });

  // Fetch task details by company name
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks/card', companyName],
    queryFn: async () => {
      const endpoint = `/api/tasks/card/${companyName}`;
      console.log('[CardTaskPage] Making API request:', {
        endpoint,
        companyName,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(endpoint);
      console.log('[CardTaskPage] API response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CardTaskPage] API error:', {
          status: response.status,
          errorText,
          timestamp: new Date().toISOString()
        });
        throw new Error('Failed to load CARD task');
      }

      const data = await response.json();
      console.log('[CardTaskPage] Task data received:', {
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
      console.error('[CardTaskPage] Error loading task:', {
        error,
        companyName,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Error",
        description: "Failed to load CARD task. Please try again.",
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast, companyName]);

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
              Could not find the CARD task for {companyName}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title={`CARD Form: ${task.metadata?.company_name || companyName}`}
          description="Complete the Compliance and Risk Disclosure (CARD) form"
        />

        <div className="container max-w-7xl mx-auto">
          <CardFormPlayground 
            taskId={task.id}
            companyName={task.metadata?.company_name || companyName}
            companyData={{
              name: task.metadata?.company_name || companyName,
              description: task.description || null
            }}
            onSubmit={(formData) => {
              // Handle form submission
              fetch('/api/card/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileName: `card_${companyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                  formData,
                  taskId: task.id
                })
              })
              .then(response => {
                if (!response.ok) throw new Error('Failed to save CARD form');
                return response.json();
              })
              .then(() => {
                toast({
                  title: "CARD Form Submitted",
                  description: "Your CARD form has been saved and the task has been updated.",
                });
                navigate('/task-center');
              })
              .catch(error => {
                console.error('[CardTaskPage] Form submission failed:', error);
                toast({
                  title: "Error",
                  description: "Failed to save CARD form. Please try again.",
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