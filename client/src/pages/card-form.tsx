import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Download, FileJson, FileText, FileSpreadsheet } from "lucide-react";

interface CardFormProps {
  params: {
    taskId: string;
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
    companyName?: string;
    cardFormFile?: number; // File ID after submission
    [key: string]: any;
  } | null;
}

export default function CardForm({ params }: CardFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const taskId = parseInt(params.taskId);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fileId, setFileId] = useState<number | null>(null);

  // Fetch task details
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks', taskId],
    enabled: !isNaN(taskId)
  });

  // Handle form submission and file saving
  const saveMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      const timestamp = new Date().toISOString().replace(/[:]/g, '').split('.')[0];
      const fileName = `card_${task?.title.toLowerCase().replace(/\s+/g, '-')}_${timestamp}`;

      const response = await fetch('/api/card/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          formData,
          taskId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save CARD form data');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setFileId(data.fileId);
      setIsSubmitted(true);
      toast({
        title: "CARD Form Submitted",
        description: "Your CARD form has been saved and the task has been updated.",
      });
    },
    onError: (error: Error) => {
      console.error('Failed to save CARD form:', error);
      toast({
        title: "Error",
        description: "Failed to save CARD form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (format: 'json' | 'csv' | 'txt') => {
    if (!fileId) return;

    try {
      const response = await fetch(`/api/card/download/${fileId}?format=${format}`);
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `card_form.${format}`;
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
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Task</h2>
          <p className="text-muted-foreground">
            Could not load the CARD task. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/task-center')}
          className="text-sm font-medium bg-white border-muted-foreground/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Task Center
        </Button>

        {isSubmitted && fileId && (
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

      <CardFormPlayground 
        taskId={taskId}
        companyName={task.metadata?.companyName || task.title.replace('Company CARD: ', '')}
        companyData={{
          name: task.metadata?.companyName || task.title.replace('Company CARD: ', ''),
          description: task.description
        }}
        onSubmit={(formData) => saveMutation.mutate(formData)}
      />
    </div>
  );
}