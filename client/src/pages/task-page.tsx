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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Download, FileJson, FileText, FileSpreadsheet } from "lucide-react";
import { CardMethodChoice } from "@/components/card/CardMethodChoice";
import { PageTemplate } from "@/components/ui/page-template";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { KYBSuccessModal } from "@/components/kyb/KYBSuccessModal";
import confetti from 'canvas-confetti';

interface TaskPageProps {
  params: {
    taskSlug: string;
  }
}

export default function TaskPage({ params: pageParams }: TaskPageProps) {
  const [, navigate] = useLocation();
  const [match, routeParams] = useRoute<{ '*': string }>("/task-center/task/:taskSlug/*");
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Parse the taskSlug to get task type and company name
  const [taskType, ...companyNameParts] = pageParams.taskSlug.split('-');
  const companyName = companyNameParts.join('-');

  // Get the flow type from the full path
  const flowType = routeParams?.['*']?.split('/').pop();

  console.log('[TaskPage] Route debugging:', {
    taskSlug: pageParams.taskSlug,
    taskType,
    companyName,
    routeParams,
    flowType,
    match,
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

      try {
        const response = await fetch(`${apiEndpoint}/${companyName}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch ${taskType.toUpperCase()} task: ${errorText}`);
        }
        const data = await response.json();
        console.log('[TaskPage] Task data fetched:', {
          taskId: data.id,
          hasMetadata: !!data.metadata,
          timestamp: new Date().toISOString()
        });

        if (data.metadata?.[`${taskType}FormFile`]) {
          setFileId(data.metadata[`${taskType}FormFile`]);
          setIsSubmitted(true);
        }
        return data;
      } catch (error) {
        console.error('[TaskPage] Task fetch error:', {
          error,
          endpoint: apiEndpoint,
          companyName,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    },
    enabled: taskType === 'kyb' || taskType === 'card',
    staleTime: 0,
  });

  useEffect(() => {
    if (error) {
      console.error('[TaskPage] Task load error effect:', {
        error,
        taskType,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Error",
        description: `Failed to load ${taskType.toUpperCase()} task. Please try again.`,
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast, taskType]);

  const handleBackClick = () => {
    console.log('[TaskPage] Navigating back to task center');
    navigate('/task-center');
  };

  if (isLoading) {
    console.log('[TaskPage] Showing loading state');
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    console.log('[TaskPage] Task not found, showing error state');
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground">
              Could not find the {taskType.toUpperCase()} task for {companyName}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const displayName = task.metadata?.company?.name || task.metadata?.companyName || companyName;

  console.log('[TaskPage] Rendering decision:', {
    taskType,
    flowType,
    displayName,
    timestamp: new Date().toISOString()
  });

  if (taskType === 'card') {
    // Handle questionnaire route
    if (flowType === 'questionnaire') {
      console.log('[TaskPage] Rendering CARD questionnaire form');
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
                  onClick={handleBackClick}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Task Center
                </Button>
              </div>
            </div>

            <div className="container max-w-7xl mx-auto">
              <CardFormPlayground
                taskId={task.id}
                companyName={companyName}
                companyData={{
                  name: displayName,
                  description: task.metadata?.company?.description || undefined
                }}
                onSubmit={(formData) => {
                  fetch('/api/card/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fileName: `card_${companyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                      formData,
                      taskId: task.id
                    })
                  })
                    .then(async response => {
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.details || data.error || 'Failed to save CARD form');
                      }
                      return data;
                    })
                    .then((result) => {
                      confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF']
                      });

                      setFileId(result.fileId);
                      setIsSubmitted(true);
                      setShowSuccessModal(true);

                      toast({
                        title: "Success",
                        description: result.warnings?.length
                          ? "Card form has been saved successfully with some updates to existing data."
                          : "Card form has been saved successfully.",
                        variant: "default",
                      });

                      if (result.warnings?.length) {
                        console.log('[TaskPage] Save completed with warnings:', result.warnings);
                      }
                    })
                    .catch(error => {
                      console.error('[TaskPage] Form submission failed:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to save CARD form. Please try again.",
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

    // Show choice page if no flow type specified
    if (!flowType) {
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
                  onClick={handleBackClick}
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

    if (flowType === 'upload') {
      console.log('[TaskPage] Rendering CARD upload flow (not implemented)');
      return (
        <DashboardLayout>
          <div>Upload flow coming soon</div>
        </DashboardLayout>
      );
    }
  }

  // KYB form rendering
  console.log('[TaskPage] Rendering KYB form');
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
              onClick={handleBackClick}
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
                description: task.metadata?.company?.description || undefined
              }}
              savedFormData={task.savedFormData}
              onSubmit={(formData) => {
                const submitData = {
                  fileName: `kyb_${companyName}_${new Date().toISOString().replace(/[:]/g, '').split('.')[0]}`,
                  formData,
                  taskId: task.id
                };

                toast({
                  title: "Saving KYB form",
                  description: "Please wait while we process your submission...",
                });

                fetch('/api/kyb/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(submitData)
                })
                  .then(async response => {
                    const data = await response.json();
                    if (!response.ok) {
                      throw new Error(data.details || data.error || 'Failed to save KYB form');
                    }
                    return data;
                  })
                  .then((result) => {
                    confetti({
                      particleCount: 150,
                      spread: 80,
                      origin: { y: 0.6 },
                      colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF']
                    });

                    setFileId(result.fileId);
                    setIsSubmitted(true);
                    setShowSuccessModal(true);

                    toast({
                      title: "Success",
                      description: result.warnings?.length
                        ? "KYB form has been saved successfully with some updates to existing data."
                        : "KYB form has been saved successfully.",
                      variant: "default",
                    });

                    if (result.warnings?.length) {
                      console.log('[TaskPage] Save completed with warnings:', result.warnings);
                    }
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
            />
          )}
        </div>

        <KYBSuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          companyName={displayName}
        />
      </PageTemplate>
    </DashboardLayout>
  );
}