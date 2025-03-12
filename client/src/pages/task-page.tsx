
import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const TaskPage: React.FC = () => {
  const [, params] = useRoute('/task-center/task/:taskSlug');
  const [, navigate] = useLocation();
  const taskSlug = params?.taskSlug;

  // Debugging log for TaskPage route
  console.log('[TaskPage] Route debugging:', {
    taskSlug,
    taskType: taskSlug?.split('-')[0],
    companyName: taskSlug?.split('-').slice(1).join('-'),
    match: !!params,
    questMatch: false,
    timestamp: new Date().toISOString(),
  });

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
      </div>
      
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Task: {taskSlug}</h1>
        <p>Task details will be loaded here based on the task slug: {taskSlug}</p>
      </div>
    </div>
  );
};

export default TaskPage;
