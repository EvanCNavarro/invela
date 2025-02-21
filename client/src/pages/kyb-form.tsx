import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { OnboardingKYBFormPlayground } from "@/components/playground/OnboardingKYBFormPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

interface KYBFormProps {
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
    [key: string]: any;
  } | null;
}

export default function KYBForm({ params }: KYBFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const taskId = parseInt(params.taskId);

  // Fetch task details
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks', taskId],
    enabled: !isNaN(taskId)
  });

  // Handle form submission and file saving
  const saveMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      // First, save the form data to a file
      const timestamp = new Date().toISOString().replace(/[:]/g, '').split('.')[0];
      const fileName = `kyb_${task?.title.toLowerCase().replace(/\s+/g, '-')}_${timestamp}`;

      const response = await fetch('/api/kyb/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          formData,
          taskId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save KYB form data');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "KYB Form Submitted",
        description: "Your KYB form has been saved and the task has been updated.",
      });
      navigate('/task-center');
    },
    onError: (error: Error) => {
      console.error('Failed to save KYB form:', error);
      toast({
        title: "Error",
        description: "Failed to save KYB form. Please try again.",
        variant: "destructive",
      });
    },
  });

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
            Could not load the KYB task. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6">
      <OnboardingKYBFormPlayground 
        taskId={taskId}
        onSubmit={(formData) => saveMutation.mutate(formData)}
        companyName={task.metadata?.companyName}
      />
    </div>
  );
}