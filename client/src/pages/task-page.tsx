import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
    company?: {
      name: string;
      description?: string;
    };
    kybFormFile?: number;
    cardFormFile?: number;
    [key: string]: any;
  } | null;
  savedFormData?: Record<string, any>;
}

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Parse the taskSlug to get task type and company name
  const [taskType, ...companyNameParts] = params.taskSlug.split('-');
  const companyName = companyNameParts.join('-');

  // Determine API endpoint based on task type
  const apiEndpoint = taskType === 'kyb' ? '/api/tasks/kyb' : '/api/tasks/card';

  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: [apiEndpoint, companyName],
    queryFn: async () => {
      const response = await fetch(`${apiEndpoint}/${companyName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${taskType.toUpperCase()} task`);
      }
      const data = await response.json();
      if (data.metadata?.[`${taskType}FormFile`]) {
        setFileId(data.metadata[`${taskType}FormFile`]);
        setIsSubmitted(true);
      }
      return data;
    },
    enabled: taskType === 'kyb' || taskType === 'card',
    staleTime: 0
  });

  useEffect(() => {
    if (error) {
      console.error('[TaskPage] Error loading task:', error);
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

  const handleDownload = async (format: 'json' | 'csv' | 'txt') => {
    if (!fileId) return;

    try {
      const downloadEndpoint = taskType === 'kyb' ? '/api/kyb/download' : '/api/card/download';
      const response = await fetch(`${downloadEndpoint}/${fileId}?format=${format}`);
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskType}_form.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the file. Please try again.",
        variant: "destructive",
      });
    }
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

  if (taskType !== 'kyb' && taskType !== 'card') {
    navigate('/task-center');
    return null;
  }

  const displayName = task.metadata?.company?.name || task.metadata?.companyName || companyName;

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
          {taskType === 'kyb' ? (
            <OnboardingKYBFormPlayground
              taskId={task.id}
              companyName={companyName}
              companyData={{
                name: displayName,
                description: task.metadata?.company?.description
              }}
              savedFormData={task.savedFormData}
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
          ) : (
            <CardFormPlayground
              taskId={task.id}
              companyName={companyName}
              companyData={{
                name: displayName,
                description: task.metadata?.company?.description || null
              }}
              savedFormData={task.savedFormData}
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
                  .then(response => {
                    if (!response.ok) throw new Error('Failed to save CARD form');
                    return response.json();
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
                  })
                  .catch(error => {
                    console.error('[TaskPage] Form submission failed:', error);
                    toast({
                      title: "Error",
                      description: "Failed to save CARD form. Please try again.",
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