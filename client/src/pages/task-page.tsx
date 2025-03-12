import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
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
import { PageTemplate } from "@/components/ui/page-template";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { KYBSuccessModal } from "@/components/kyb/KYBSuccessModal";
import confetti from 'canvas-confetti';
import { CardMethodChoice } from "@/components/card/CardMethodChoice";

interface TaskPageProps {
  params: {
    taskSlug: string;
  }
}

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const [match, routeParams] = useRoute("/task-center/task/:fullPath*");
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Parse the taskSlug to get task type and company name
  const [taskType, ...companyNameParts] = params.taskSlug.split('-');
  const companyName = companyNameParts.join('-');

  // Get the flow type from the full path
  const fullPath = routeParams?.fullPath || '';
  const flowType = fullPath.includes('/') ? fullPath.split('/').pop() : '';

  const apiEndpoint = taskType === 'kyb' ? '/api/tasks/kyb' : '/api/tasks/card';

  const { data: task, isLoading, error } = useQuery({
    queryKey: [apiEndpoint, companyName],
    queryFn: async () => {
      try {
        const response = await fetch(`${apiEndpoint}/${companyName}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch ${taskType.toUpperCase()} task: ${errorText}`);
        }
        const data = await response.json();
        if (data.metadata?.[`${taskType}FormFile`]) {
          setFileId(data.metadata[`${taskType}FormFile`]);
          setIsSubmitted(true);
        }
        return data;
      } catch (error) {
        throw error;
      }
    },
    enabled: taskType === 'kyb' || taskType === 'card',
    staleTime: 0,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: `Failed to load ${taskType.toUpperCase()} task. Please try again.`,
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast, taskType]);

  const handleBackClick = () => {
    navigate('/task-center');
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

  if (taskType === 'card') {
    // Handle questionnaire route
    if (flowType === 'questionnaire') {
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

                {(isSubmitted || task.metadata?.cardFormFile) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload('json')}>
                        <FileJson className="mr-2 h-4 w-4" />
                        Download as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('csv')}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Download as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('txt')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Download as Text
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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
      return (
        <DashboardLayout>
          <div>Upload flow coming soon</div>
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
              onClick={handleBackClick}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Task Center
            </Button>

            {(isSubmitted || task.metadata?.[`${taskType}FormFile`]) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload('json')}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Download as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('csv')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Download as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('txt')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Download as Text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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