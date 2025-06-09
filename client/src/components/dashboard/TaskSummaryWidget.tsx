/**
 * ========================================
 * Task Summary Widget Component
 * ========================================
 * 
 * Displays an overview of task completion status, active tasks,
 * and progress metrics for the current company. Integrates with
 * the unified task management system to provide real-time updates.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Widget } from "@/components/dashboard/Widget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText,
  ArrowRight,
  Activity
} from "lucide-react";
import { getOptimizedQueryOptions } from "@/lib/queryClient";
import type { SelectTask, TaskStatus } from "@db/schema";

interface TaskSummaryWidgetProps {
  onToggle: () => void;
  isVisible: boolean;
}

interface TaskSummary {
  total: number;
  completed: number;
  incomplete: number;
  overdue: number;
  completionRate: number;
}

export function TaskSummaryWidget({ onToggle, isVisible }: TaskSummaryWidgetProps) {
  // Fetch task data using the existing tasks API
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: () => fetch('/api/tasks').then(res => res.json()) as Promise<SelectTask[]>,
    ...getOptimizedQueryOptions('/api/tasks'),
    select: (data: SelectTask[]) => data || []
  });

  // Calculate task summary metrics
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const taskSummary: TaskSummary = {
    total: tasks.length,
    completed: completedTasks,
    incomplete: tasks.length - completedTasks,
    overdue: tasks.filter(task => task.status === 'failed').length,
    completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
  };

  const recentTasks = tasks
    .filter(task => task.status !== 'completed')
    .slice(0, 3);

  if (isLoading) {
    return (
      <Widget
        title="Task Summary"
        icon={<FileText className="h-5 w-5" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
      >
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget
      title="Task Summary"
      icon={<FileText className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
    >
      <div className="space-y-4">
        {/* Progress Overview */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="widget-text">Completion Rate</span>
            <span className="widget-number">{taskSummary.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${taskSummary.completionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Task Metrics - Horizontal layout */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-gray-700" />
              <span className="widget-text">Completed</span>
            </div>
            <div className="widget-number text-green-700">{taskSummary.completed}</div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-700" />
              <span className="widget-text">Incomplete</span>
            </div>
            <div className="widget-number text-amber-700">{taskSummary.incomplete}</div>
          </div>
        </div>

        {/* Recent Active Tasks */}
        {recentTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="widget-text flex items-center">
              <Activity className="h-4 w-4 mr-2 text-gray-700" />
              Active Tasks
            </h4>
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <div className="flex-1 min-w-0">
                  <div className="widget-text truncate">
                    {task.title}
                  </div>
                  <div className="widget-text text-gray-500">
                    {task.task_type?.replace('_', ' ')}
                  </div>
                </div>
                <Badge 
                  variant={task.status === 'in_progress' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {task.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* View All Tasks Button */}
        <Button variant="outline" className="w-full" size="sm">
          View All Tasks
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </Widget>
  );
}