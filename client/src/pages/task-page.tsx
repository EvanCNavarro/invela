
import React, { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { api } from '@/lib/api';

// Export the component as TaskPage (the name that's being imported)
export const TaskPage: React.FC = () => {
  const [, params] = useRoute('/task-center/task/:taskSlug');
  const [, navigate] = useLocation();
  const taskSlug = params?.taskSlug;

  // Extract task ID from slug if available
  const taskId = taskSlug?.split('-')[0] === 'card' ? null : 
                (taskSlug ? parseInt(taskSlug.split('-')[0]) : null);

  console.log('[TaskPage] Route debugging:', {
    taskSlug,
    taskType: taskSlug?.split('-')[0],
    companyName: taskSlug?.replace('card-', ''),
    match: true,
    questMatch: false,
    timestamp: new Date().toISOString()
  });

  // Redirect card tasks to the questionnaire
  useEffect(() => {
    if (taskSlug && taskSlug.startsWith('card-')) {
      navigate(`/task-center/task/${taskSlug}/questionnaire`);
    }
  }, [taskSlug, navigate]);
  
  // If it's a card task, we'll redirect, so just show a loading spinner
  if (taskSlug?.startsWith('card-')) {
    return (
      <DashboardLayout>
        <div className="container max-w-7xl mx-auto py-6">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // For regular tasks, proceed with fetching task details
  const { data: task, isLoading, error } = useQuery({
    queryKey: ['/api/tasks', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      return await api.get(`/api/tasks/${taskId}`);
    },
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
            Back to Task Center
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Task</h2>
            <p className="text-muted-foreground">
              Could not load the task information. Please try again later.
            </p>
          </div>
        ) : !task ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground">
              The requested task could not be found.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">{task.title}</h2>
            <div className="prose max-w-none">
              {task.description && <p>{task.description}</p>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TaskPage;
