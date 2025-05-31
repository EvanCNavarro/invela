/**
 * ========================================
 * Task Summary Widget Component
 * ========================================
 * 
 * Displays an overview of task completion status, active tasks,
 * and progress metrics for the current company. Integrates with
 * the unified task management system to provide real-time updates.
 */

import { useState, useEffect } from "react";
import { unifiedWebSocketService } from '@/services/websocket-unified';
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

import type { SelectTask, TaskStatus } from "@db/schema";

interface TaskSummaryWidgetProps {
  onToggle: () => void;
  isVisible: boolean;
}

interface TaskSummary {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export function TaskSummaryWidget({ onToggle, isVisible }: TaskSummaryWidgetProps) {
  // WebSocket-only data state - NO HTTP polling
  const [tasks, setTasks] = useState<SelectTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // WebSocket subscription for task data
  
  useEffect(() => {
    // Connect and subscribe to initial data
    unifiedWebSocketService.connect().catch(console.error);
    
    const unsubInitialData = unifiedWebSocketService.subscribe('initial_data', (data) => {
      if (data.tasks) {
        setTasks(data.tasks);
        setIsLoading(false);
      }
    });

    // Subscribe to task data updates
    const unsubTaskData = unifiedWebSocketService.subscribe('task_data', (data) => {
      setTasks(data);
    });

    // Subscribe to individual task updates
    const unsubTaskUpdate = unifiedWebSocketService.subscribe('task_updated', (data) => {
      const taskId = data?.taskId || data?.id;
      if (taskId) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, ...data } : task
          )
        );
      }
    });

    return () => {
      unsubInitialData();
      unsubTaskData();
      unsubTaskUpdate();
    };
  }, [subscribe]);

  // Calculate task summary metrics
  const taskSummary: TaskSummary = {
    total: tasks.length,
    completed: tasks.filter(task => task.status === 'completed').length,
    pending: tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length,
    overdue: tasks.filter(task => task.status === 'failed').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(task => task.status === 'completed').length / tasks.length) * 100) : 0
  };

  const recentTasks = tasks
    .filter(task => task.status !== 'completed')
    .slice(0, 3);

  if (isLoading) {
    return (
      <Widget
        title="Task Summary"
        subtitle="Loading task overview..."
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
      subtitle={`${taskSummary.total} total tasks`}
      icon={<FileText className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
    >
      <div className="space-y-4">
        {/* Progress Overview */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Completion Rate</span>
            <span className="text-2xl font-bold text-indigo-600">{taskSummary.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${taskSummary.completionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Task Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-lg font-semibold text-green-700">{taskSummary.completed}</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <Clock className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-lg font-semibold text-yellow-700">{taskSummary.pending}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
          </div>
        </div>

        {/* Recent Active Tasks */}
        {recentTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Active Tasks
            </h4>
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-500">
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