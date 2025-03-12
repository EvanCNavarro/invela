
import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { api } from '@/lib/api';

export const TaskPage: React.FC = () => {
  const [, params] = useRoute('/task-center/task/:taskSlug');
  const [, navigate] = useLocation();
  const taskSlug = params?.taskSlug;

  // Extract task ID from slug if available (can be enhanced based on your URL structure)
  const taskId = taskSlug?.split('-')[0] === 'card' ? null : 
                (taskSlug ? parseInt(taskSlug.split('-')[0]) : null);

  // Debugging log for TaskPage route
  console.log('[TaskPage] Route debugging:', {
    taskSlug,
    taskType: taskSlug?.split('-')[0],
    companyName: taskSlug?.split('-').slice(1).join('-'),
    match: !!params,
    questMatch: false,
    timestamp: new Date().toISOString(),
  });

  // Fetch task detail if we have a task ID
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskId ? api.getTask(taskId) : null,
    enabled: !!taskId,
  });

  return (
    <DashboardLayout>
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
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Task: {task?.title || taskSlug}</h1>
            {task ? (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-muted-foreground mb-4">{task.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p>{task.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p>{task.task_type}</p>
                  </div>
                  {task.due_date && (
                    <div>
                      <p className="text-sm font-medium">Due Date</p>
                      <p>{new Date(task.due_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Progress</p>
                    <p>{task.progress}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <p>Task details will be loaded here based on the task slug: {taskSlug}</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TaskPage;
import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface TaskPageProps {
  params: {
    slug: string;
  };
}

export default function TaskPage({ params }: TaskPageProps) {
  const [, navigate] = useLocation();
  const { slug } = params;
  
  useEffect(() => {
    // If task slug starts with card-, redirect to the questionnaire
    if (slug.startsWith('card-')) {
      navigate(`/task-center/task/${slug}/questionnaire`);
    }
  }, [slug, navigate]);
  
  return (
    <div className="flex items-center justify-center h-screen">
      <LoadingSpinner />
    </div>
  );
}
