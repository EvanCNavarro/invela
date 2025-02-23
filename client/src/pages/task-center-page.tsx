import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { SearchBar } from "@/components/playground/SearchBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { User, Users2, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { TaskStatus } from "@db/schema";
import { wsService } from "@/lib/websocket";
import { TaskTable } from "@/components/tasks/TaskTable";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  progress: number;  // Explicitly typing progress as number
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [typeFilter, setTypeFilter] = useState("All Task Types");
  const [scopeFilter, setScopeFilter] = useState("All Assignee Types");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'asc' });
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 1000,
    refetchInterval: 5000,
  });

  const { data: currentCompany, isLoading: isCompanyLoading } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    staleTime: 5 * 60 * 1000,
  });

  const isCompanyOnboarded = currentCompany?.onboarding_company_completed ?? false;

  const isLoading = isTasksLoading || isCompanyLoading;

  useEffect(() => {
    const subscriptions: Array<() => void> = [];

    const setupSubscriptions = async () => {
      try {
        const unsubTaskUpdate = await wsService.subscribe('task_updated', (data) => {
          console.log('[TaskCenter] WebSocket Update Received:', {
            taskId: data.taskId,
            newStatus: data.status,
            newProgress: data.progress,
            timestamp: new Date().toISOString()
          });

          queryClient.setQueryData(["/api/tasks"], (oldTasks: Task[] = []) => {
            const updatedTasks = oldTasks.map(task =>
              task.id === data.taskId
                ? { 
                    ...task, 
                    status: data.status, 
                    progress: data.progress || 0 
                  }
                : task
            );

            console.log('[TaskCenter] Updated task state:', {
              taskId: data.taskId,
              progress: data.progress,
              updatedTask: updatedTasks.find(t => t.id === data.taskId)
            });

            return updatedTasks;
          });

          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        });

        subscriptions.push(unsubTaskUpdate);
      } catch (error) {
        console.error('[TaskCenter] Error setting up WebSocket subscriptions:', error);
      }
    };

    setupSubscriptions();

    return () => {
      subscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[TaskCenter] Error unsubscribing from WebSocket:', error);
        }
      });
    };
  }, [queryClient]);

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

  const filteredTasks = (!isLoading && currentCompany?.id)
    ? tasks.filter((task) => {
        console.log('[TaskCenter] Filtering task:', {
          taskId: task.id,
          status: task.status,
          scope: task.task_scope,
          activeTab,
          userId: user?.id,
          companyId: currentCompany.id,
          progress: task.progress
        });

        if (activeTab === "my-tasks") {
          return task.company_id === currentCompany.id && 
                 (task.assigned_to === user?.id || 
                  (task.task_scope === "company" && task.company_id === currentCompany.id));
        } else if (activeTab === "for-others") {
          return task.created_by === user?.id && (!task.assigned_to || task.assigned_to !== user?.id);
        }

        return false;
      })
    : [];

  const sortedAndFilteredTasks = [...filteredTasks].sort((a, b) => {
    if (sortConfig.key === 'due_date') {
      const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
    } else if (sortConfig.key === 'status') {
      return sortConfig.direction === 'asc' ?
        (a.status || '').localeCompare(b.status || '') :
        (b.status || '').localeCompare(a.status || '');
    } else if (sortConfig.key === 'progress') {
      return sortConfig.direction === 'asc' ? 
        (a.progress || 0) - (b.progress || 0) : 
        (b.progress || 0) - (a.progress || 0);
    }
    return 0;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedAndFilteredTasks.length / itemsPerPage);
  const currentTasks = sortedAndFilteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters = searchQuery !== "" ||
    statusFilter !== "All Statuses" ||
    typeFilter !== "All Task Types" ||
    scopeFilter !== "All Assignee Types";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Statuses");
    setTypeFilter("All Task Types");
    setScopeFilter("All Assignee Types");
    setSearchResults([]);
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

  const lockedFeatureTooltip = "Complete onboarding to unlock features";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Task Center"
              description="Manage and track your company's tasks and submissions."
            />
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CreateTaskModal disabled={!isCompanyOnboarded} />
                  </div>
                </TooltipTrigger>
                {!isCompanyOnboarded && (
                  <TooltipContent side="left">
                    <p>{lockedFeatureTooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          <Tabs
            defaultValue="my-tasks"
            className="w-full"
            onValueChange={(value) => {
              setActiveTab(value);
              setCurrentPage(1);
            }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
              <TabsList className="w-fit bg-background h-9">
                <TabsTrigger
                  value="my-tasks"
                  className={cn(
                    "flex items-center gap-1.5 data-[state=active]:text-primary px-3",
                    "data-[state=active]:bg-primary/10 h-9"
                  )}
                >
                  <User className="h-4 w-4" />
                  <span>My Tasks</span>
                  {myTasksCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {myTasksCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <TabsTrigger
                          value="for-others"
                          disabled={!isCompanyOnboarded}
                          className={cn(
                            "flex items-center gap-1.5 data-[state=active]:text-primary px-3",
                            "data-[state=active]:bg-primary/10 h-9",
                            !isCompanyOnboarded && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Users2 className="h-4 w-4" />
                          <span>For Others</span>
                          {!isCompanyOnboarded && <Lock className="h-3 w-3 ml-1" />}
                          {forOthersCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                              {forOthersCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </div>
                    </TooltipTrigger>
                    {!isCompanyOnboarded && (
                      <TooltipContent side="bottom">
                        <p>{lockedFeatureTooltip}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </TabsList>
              <div className="w-full sm:w-[250px]">
                <SearchBar
                  contextualType="tasks"
                  data={tasks}
                  keys={['title', 'description']}
                  onResults={(results) => {
                    setSearchResults(results.map(result => result.item) as Task[]);
                  }}
                  onSearch={(value) => setSearchQuery(value)}
                  isLoading={isLoading}
                  placeholder="Search for tasks"
                  containerClassName="w-full"
                />
              </div>
            </div>

            <Card className="w-full">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 mb-6">
                  <Button
                    variant={hasActiveFilters ? "default" : "outline"}
                    size="default"
                    className="flex items-center w-10 h-10 shrink-0"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                  >
                    <FilterX className="h-4 w-4" />
                  </Button>

                  <div className="flex flex-wrap gap-4 flex-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue>{statusFilter}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Statuses">All Statuses</SelectItem>
                        <SelectItem value={TaskStatus.NOT_STARTED}>Not Started</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatus.READY_FOR_SUBMISSION}>Ready for Submission</SelectItem>
                        <SelectItem value={TaskStatus.SUBMITTED}>Submitted</SelectItem>
                        <SelectItem value={TaskStatus.APPROVED}>Approved</SelectItem>
                        <SelectItem value={TaskStatus.EMAIL_SENT}>Email Sent</SelectItem>
                        <SelectItem value={TaskStatus.COMPLETED}>Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue>{typeFilter}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Task Types">All Task Types</SelectItem>
                        <SelectItem value="user_onboarding">User Onboarding</SelectItem>
                        <SelectItem value="file_request">File Request</SelectItem>
                        <SelectItem value="company_kyb">Company KYB</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={scopeFilter} onValueChange={setScopeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue>{scopeFilter}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Assignee Types">All Assignee Types</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="min-h-[400px] overflow-x-auto">
                  <TabsContent value="my-tasks" className="m-0">
                    <TaskTable tasks={currentTasks} companyOnboardingCompleted={isCompanyOnboarded}/>
                  </TabsContent>

                  <TabsContent value="for-others" className="m-0">
                    <TaskTable tasks={currentTasks} companyOnboardingCompleted={isCompanyOnboarded}/>
                  </TabsContent>
                </div>

                {!isLoading && totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedAndFilteredTasks.length)} of {sortedAndFilteredTasks.length} tasks
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}