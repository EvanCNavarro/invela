import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface KYBTaskPageProps {
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
    [key: string]: any;
  } | null;
}

export default function KYBTaskPage({ params }: KYBTaskPageProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const companyName = params.slug.replace('kyb-', '');
  
  // Parse URL query parameters to check for review=true
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const isReviewMode = searchParams.get('review') === 'true';

  // Fetch task details by company name
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks/kyb', companyName],
    enabled: !!companyName
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
              Could not find the KYB task for {companyName}. Please try again.
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
          title={`KYB Form: ${task.metadata?.company_name || companyName}`}
          description="Complete the Know Your Business (KYB) verification form"
        />

        <div className="container max-w-7xl mx-auto">
          <OnboardingKYBFormPlayground 
            taskId={task.id}
            initialReviewMode={isReviewMode} // Set initial review mode from URL parameter
            onSubmit={(formData) => {
              // Handle form submission
              fetch('/api/kyb/save', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json' 
                },
                body: JSON.stringify({
                  fileName: `kyb_${companyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                  formData,
                  taskId: task.id
                })
              })
              .then(async response => {
                // First check if response is ok
                if (!response.ok) {
                  // Try to get error details if available in JSON format
                  try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to save KYB form');
                  } catch (jsonError) {
                    // If can't parse as JSON, get text and log it
                    const textResponse = await response.text();
                    console.error('Server returned non-JSON response:', textResponse);
                    throw new Error('Server returned invalid response. Please try again.');
                  }
                }
                
                // If response is ok, parse JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                  return response.json();
                } else {
                  // If not JSON but response is OK, we still proceed
                  return { success: true };
                }
              })
              .then(() => {
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
                  description: error.message || "Failed to save KYB form. Please try again.",
                  variant: "destructive",
                });
              });
            }}
            companyName={task.metadata?.company_name || companyName}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
