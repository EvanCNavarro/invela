/**
 * ========================================
 * Task Center Page - Unified WebSocket Implementation
 * ========================================
 */

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Users2, 
  Lock, 
  ArrowUpDown, 
  ArrowDownUp, 
  FilterX 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatus } from "@db/schema";
import { useUnifiedWebSocket } from "@/hooks/use-unified-websocket";
import { TaskTable } from "@/components/tasks/TaskTable";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Company {
  id: number;
  name: string;
  onboarding_company_completed: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  task_scope: string;
  status: TaskStatus;
  priority: string;
  progress: number;
  assigned_to: number | null;
  created_by: number | null;
  user_email: string | null;
  company_id: number | null;
  due_date: string | null;
  files_requested: string[] | null;
  files_uploaded: string[] | null;
  metadata: Record<string, any> | null;
}

export default function TaskCenterPage() {
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [typeFilter, setTypeFilter] = useState("All Task Types");
  const [scopeFilter, setScopeFilter] = useState("All Assignee Types");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [wsConnected, setWsConnected] = useState(false);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isConnected, subscribe } = useUnifiedWebSocket();
  
  const taskTimestampRef = useRef<Record<number, number>>({});

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 5000,
    refetchInterval: wsConnected ? false : 15000,
    select: (data) => {
      const now = Date.now();
      data.forEach(task => {
        taskTimestampRef.current[task.id] = now;
      });
      return data;
    }
  });

  const { data: currentCompany, isLoading: isCompanyLoading } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    staleTime: 5 * 60 * 1000,
  });

  const isCompanyOnboarded = currentCompany?.onboarding_company_completed ?? false;
  const isLoading = isTasksLoading || isCompanyLoading;

  // Force task status refresh when navigating to task center
  useEffect(() => {
    const refreshTasks = async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    };
    refreshTasks();
  }, [queryClient]);

  // Unified WebSocket subscription
  useEffect(() => {
    setWsConnected(isConnected);
    
    if (isConnected) {
      console.log('[TaskCenter] Unified WebSocket connection established');
      
      const subscriptions: (() => void)[] = [];
      
      // Subscribe to task updates
      const unsubTaskUpdate = subscribe('task_update', (data: any) => {
        console.log('[TaskCenter] Unified task update received:', data);
        
        // Check for task data in both root level and payload
        const taskData = data?.payload || data;
        const taskId = taskData?.taskId || taskData?.id || data?.taskId || data?.id;
        
        if (!taskId) {
          console.warn('[TaskCenter] Missing task ID in update', { data, taskData });
          return;
        }
        
        const now = Date.now();
        const serverTimestamp = taskData.metadata?.timestamp || data.metadata?.timestamp 
          ? new Date(taskData.metadata?.timestamp || data.metadata?.timestamp).getTime()
          : now;
          
        const prevTimestamp = taskTimestampRef.current[taskId];
        
        if (!prevTimestamp || serverTimestamp >= prevTimestamp) {
          taskTimestampRef.current[taskId] = serverTimestamp;
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }
      });
      
      subscriptions.push(unsubTaskUpdate);
      
      // Subscribe to test notifications
      const unsubTestNotification = subscribe('task_test_notification', (data: any) => {
        console.log('[TaskCenter] Test notification received:', data);
        const taskId = data?.id || data?.taskId;
        if (taskId) {
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }
      });
      
      subscriptions.push(unsubTestNotification);

      return () => {
        subscriptions.forEach(unsubscribe => {
          try {
            unsubscribe();
          } catch (error) {
            console.error('[TaskCenter] Error unsubscribing:', error);
          }
        });
      };
    }
  }, [isConnected, subscribe, queryClient]);

  const myTasksCount = !isLoading && currentCompany?.id
    ? tasks.filter(task => 
        task.company_id === currentCompany.id && 
        (task.assigned_to === user?.id || 
         (task.task_scope === "company" && task.company_id === currentCompany.id))
      ).length
    : 0;

  const forOthersCount = !isLoading && user?.id
    ? tasks.filter(task => 
        task.created_by === user.id && 
        (!task.assigned_to || task.assigned_to !== user.id)
      ).length
    : 0;

  const applyFilters = (task: Task): boolean => {
    if (statusFilter !== "All Statuses" && task.status !== statusFilter) {
      return false;
    }
    
    if (typeFilter !== "All Task Types") {
      if (typeFilter === "KYB" && task.task_type !== "company_kyb") {
        return false;
      }
      if (typeFilter !== "KYB" && task.task_type !== typeFilter) {
        return false;
      }
    }
    
    if (scopeFilter !== "All Assignee Types") {
      if (scopeFilter === "Assigned to me" && task.assigned_to !== user?.id) {
        return false;
      }
    }
    
    return true;
  };

  const getFilteredTasks = () => {
    if (!isLoading && currentCompany?.id) {
      return tasks.filter(task => applyFilters(task));
    }
    return [];
  };

  const getTabSpecificTasks = () => {
    const filteredTasks = getFilteredTasks();
    
    if (activeTab === "my-tasks") {
      return filteredTasks.filter(task => 
        task.company_id === currentCompany?.id && 
        (task.assigned_to === user?.id || 
         (task.task_scope === "company" && task.company_id === currentCompany?.id))
      );
    } else if (activeTab === "for-others") {
      return filteredTasks.filter(task => 
        task.created_by === user?.id && 
        (!task.assigned_to || task.assigned_to !== user?.id)
      );
    }
    
    return filteredTasks;
  };

  const sortTasks = (tasksToSort: Task[]) => {
    return [...tasksToSort].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Task];
      const bValue = b[sortConfig.key as keyof Task];
      
      if (sortConfig.key === 'id') {
        return sortConfig.direction === 'asc' 
          ? (a.id - b.id) 
          : (b.id - a.id);
      }
      
      if (sortConfig.key === 'progress') {
        return sortConfig.direction === 'asc' 
          ? (a.progress - b.progress) 
          : (b.progress - a.progress);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  };

  const sortedTasks = sortTasks(getTabSpecificTasks());
  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setStatusFilter("All Statuses");
    setTypeFilter("All Task Types");
    setScopeFilter("All Assignee Types");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Task Center"
          description="Manage and track all tasks across your organization"
          actions={<CreateTaskModal />}
        />
        
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="my-tasks" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  My Tasks ({myTasksCount})
                </TabsTrigger>
                <TabsTrigger value="for-others" className="flex items-center gap-2">
                  <Users2 className="h-4 w-4" />
                  For Others ({forOthersCount})
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  wsConnected ? "bg-green-500" : "bg-red-500"
                )}></div>
                {wsConnected ? "Connected" : "Disconnected"}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 py-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Statuses">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Task Types">All Task Types</SelectItem>
                  <SelectItem value="KYB">KYB</SelectItem>
                  <SelectItem value="ky3p">KY3P</SelectItem>
                  <SelectItem value="open_banking">Open Banking</SelectItem>
                </SelectContent>
              </Select>

              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Assignee Types">All Assignee Types</SelectItem>
                  <SelectItem value="Assigned to me">Assigned to me</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <FilterX className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>

            <TabsContent value="my-tasks" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  {paginatedTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tasks found matching your criteria.</p>
                    </div>
                  ) : (
                    <TaskTable
                      tasks={paginatedTasks}
                      companyOnboardingCompleted={isCompanyOnboarded}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="for-others" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  {paginatedTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tasks found matching your criteria.</p>
                    </div>
                  ) : (
                    <TaskTable
                      tasks={paginatedTasks}
                      companyOnboardingCompleted={isCompanyOnboarded}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}