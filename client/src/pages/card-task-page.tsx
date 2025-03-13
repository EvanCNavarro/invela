
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { api } from '@/lib/api';

interface CardTaskPageProps {
  params: {
    slug: string;
  };
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

      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        console.error('[CardTaskPage] API request error:', err);
        throw err;
      }
    },
    retry: 1,
  });

  if (isLoading) {
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

  if (error || !task) {
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
          
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Task</h2>
            <p className="text-muted-foreground">
              Could not load the CARD task information for {companyName}. Please try again later.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
        
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Company CARD: {companyName}</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-muted-foreground mb-4">{task.description || "Complete the Company CARD Assessment"}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p>{task.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Progress</p>
                <p>{task.progress}%</p>
              </div>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={() => navigate(`/task-center/task/${params.slug}/questionnaire`)}
                className="w-full"
              >
                {task.status === 'not_started' ? 'Start Assessment' : 'Continue Assessment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
