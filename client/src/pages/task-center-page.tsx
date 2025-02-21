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
import { User, Users2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskStatus } from "@db/schema";
import { wsService } from "@/lib/websocket";

// Matching the snake_case from the database.  This is the key change to align with the backend.
interface Task {
  id: number;
  title: string;
  description: string;
  task_type: 'user_onboarding' | 'file_request' | 'user_invitation' | 'company_kyb';
  task_scope: 'user' | 'company';
  status: TaskStatus;
  progress: number;
  assigned_to?: number;
  created_by: number;
  user_email?: string;
  company_id?: number;
  due_date?: string;
}

const taskStatusMap = {
  [TaskStatus.EMAIL_SENT]: 'Email Sent',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.NOT_STARTED]: 'Not Started',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.READY_FOR_SUBMISSION]: 'Ready for Submission',
  [TaskStatus.SUBMITTED]: 'Submitted',
  [TaskStatus.APPROVED]: 'Approved',
} as const;

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case TaskStatus.NOT_STARTED:
    case TaskStatus.EMAIL_SENT:
      return "secondary";
    case TaskStatus.COMPLETED:
    case TaskStatus.APPROVED:
      return "default";
    case TaskStatus.IN_PROGRESS:
    case TaskStatus.READY_FOR_SUBMISSION:
    case TaskStatus.SUBMITTED:
      return "outline";
    default:
      return "default";
  }
};

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

  // Add detailed logging for data fetching
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    onSuccess: (data) => {
      console.log('[TaskCenter] Fetched tasks:', {
        count: data.length,
        tasks: data.map(t => ({
          id: t.id,
          title: t.title,
          task_scope: t.task_scope,
          task_type: t.task_type,
          assigned_to: t.assigned_to,
          company_id: t.company_id,
          status: t.status
        }))
      });
    }
  });

  const { data: currentCompany } = useQuery({
    queryKey: ["/api/companies/current"],
    staleTime: 5 * 60 * 1000,
    onSuccess: (data) => {
      console.log('[TaskCenter] Current company:', data);
    }
  });

  // Set up WebSocket subscription for real-time updates
  useEffect(() => {
    const subscriptions: Array<() => void> = [];

    const setupSubscriptions = async () => {
      try {
        // Subscribe to task creation
        const unsubTaskCreate = await wsService.subscribe('task_created', (data) => {
          queryClient.setQueryData(["/api/tasks"], (oldTasks: Task[] = []) => {
            const newTasks = [...oldTasks];
            if (!newTasks.find(t => t.id === data.task.id)) {
              newTasks.push(data.task);
            }
            return newTasks;
          });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        });
        subscriptions.push(unsubTaskCreate);

        // Subscribe to task updates
        const unsubTaskUpdate = await wsService.subscribe('task_updated', (data) => {
          queryClient.setQueryData(["/api/tasks"], (oldTasks: Task[] = []) => {
            return oldTasks.map(task =>
              task.id === data.taskId
                ? { ...task, status: data.status, progress: data.progress }
                : task
            );
          });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        });
        subscriptions.push(unsubTaskUpdate);

      } catch (error) {
        console.error('Error setting up WebSocket subscriptions:', error);
      }
    };

    setupSubscriptions();

    return () => {
      subscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from WebSocket:', error);
        }
      });
    };
  }, [queryClient]);

  useEffect(() => {
    console.group('[TaskCenter] Task Count Analysis');
    console.log('All tasks:', tasks.map(t => ({
      id: t.id,
      title: t.title,
      company_id: t.company_id,
      task_scope: t.task_scope,
      created_by: t.created_by,
      assigned_to: t.assigned_to
    })));
    console.log('Current user:', {
      id: user?.id,
      email: user?.email,
      company_id: currentCompany?.id
    });
    console.log('My Tasks count:', getTaskCountForTab('my-tasks'));
    console.log('For Others count:', getTaskCountForTab('for-others'));
    console.groupEnd();
  }, [tasks, user, currentCompany]);

  const filteredTasks = tasks.filter((task) => {
    console.group(`[TaskCenter] Filtering task ${task.id}`);
    console.log('Task details:', {
      id: task.id,
      title: task.title,
      task_type: task.task_type,
      task_scope: task.task_scope,
      company_id: task.company_id,
      user_company_id: currentCompany?.id,
      assigned_to: task.assigned_to,
      user_email: task.user_email,
      current_user_id: user?.id,
      current_user_email: user?.email,
      active_tab: activeTab
    });

    // First, check company match
    const companyMatches = task.company_id === currentCompany?.id;
    console.log('Company match check:', { companyMatches, reason: !companyMatches ? 'Wrong company' : 'Company matches' });

    if (!companyMatches) {
      console.groupEnd();
      return false;
    }

    // For "My Tasks" tab
    if (activeTab === "my-tasks") {
      // Check if it's a company-wide task
      if (task.task_scope === 'company') {
        console.log('Company-wide task - including in My Tasks');
        console.groupEnd();
        return true;
      }

      // For user-specific tasks
      if (task.task_scope === 'user') {
        const isAssignedToUser = task.assigned_to === user?.id;
        const matchesUserEmail = task.user_email?.toLowerCase() === user?.email?.toLowerCase();

        console.log('User-specific task checks:', {
          isAssignedToUser,
          matchesUserEmail,
          result: isAssignedToUser || matchesUserEmail
        });

        console.groupEnd();
        return isAssignedToUser || matchesUserEmail;
      }
    }

    // For "For Others" tab
    if (activeTab === "for-others") {
      const isCreatedByUser = task.created_by === user?.id;
      const isNotAssignedToUser = task.assigned_to !== user?.id;
      const isUserTask = task.task_scope === 'user';

      console.log('For Others tab checks:', {
        isCreatedByUser,
        isNotAssignedToUser,
        isUserTask,
        result: isCreatedByUser && isNotAssignedToUser && isUserTask
      });

      console.groupEnd();
      return isCreatedByUser && isNotAssignedToUser && isUserTask;
    }

    console.groupEnd();
    return false;
  });

  console.log('[TaskCenter] After filtering:', {
    totalTasks: tasks.length,
    filteredCount: filteredTasks.length,
    filteredTasks: filteredTasks.map(t => ({
      id: t.id,
      title: t.title,
      task_scope: t.task_scope,
      assigned_to: t.assigned_to
    }))
  });

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
      return sortConfig.direction === 'asc' ? a.progress - b.progress : b.progress - a.progress;
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

  const getTaskCountForTab = (tabId: string) => {
    return tasks.filter(task => {
      // First check company match for all cases
      if (task.company_id !== currentCompany?.id) {
        return false;
      }

      if (tabId === "my-tasks") {
        // Show all company-wide tasks from user's company
        if (task.task_scope === 'company') {
          return true;
        }

        // For user-specific tasks
        if (task.task_scope === 'user') {
          const isAssignedToUser = task.assigned_to === user?.id;
          const matchesUserEmail = task.user_email?.toLowerCase() === user?.email?.toLowerCase();
          return isAssignedToUser || matchesUserEmail;
        }
      } else if (tabId === "for-others") {
        // Only show user-specific tasks where:
        // 1. Current user is the creator
        // 2. Task is not assigned to current user
        // 3. Task is user-scoped
        const isCreatedByUser = task.created_by === user?.id;
        const isNotAssignedToUser = task.assigned_to !== user?.id;
        const isUserTask = task.task_scope === 'user';

        return isCreatedByUser && isNotAssignedToUser && isUserTask;
      }

      return false;
    }).length;
  };

  const renderTaskList = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8">
            <div className="flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (currentTasks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
            No tasks found
          </TableCell>
        </TableRow>
      );
    }

    return currentTasks.map((task) => (
      <TableRow key={task.id}>
        <TableCell className="font-medium">{task.title}</TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(task.status)}>
            {taskStatusMap[task.status as keyof typeof taskStatusMap] || task.status.replace(/_/g, ' ')}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="w-full bg-secondary h-2 rounded-full">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground mt-1">
            {task.progress}%
          </span>
        </TableCell>
        <TableCell>
          {task.due_date ? format(new Date(task.due_date), 'PP') : '-'}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Task Center"
              description="Manage and track your company's tasks and submissions."
            />
            <CreateTaskModal />
          </div>

          <Tabs
            defaultValue="my-tasks"
            className="w-full"
            onValueChange={(value) => {
              setActiveTab(value);
              setCurrentPage(1);
            }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <TabsList className="mb-0 bg-background">
                <TabsTrigger
                  value="my-tasks"
                  className={cn(
                    "flex items-center gap-2 data-[state=active]:text-primary",
                    "data-[state=active]:bg-primary/10"
                  )}
                >
                  <User className="h-4 w-4" />
                  <span className="flex items-center gap-2">
                    My Tasks
                    {getTaskCountForTab("my-tasks") > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center"
                      >
                        {getTaskCountForTab("my-tasks")}
                      </Badge>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="for-others"
                  className={cn(
                    "flex items-center gap-2 data-[state=active]:text-primary",
                    "data-[state=active]:bg-primary/10"
                  )}
                >
                  <Users2 className="h-4 w-4" />
                  <span className="flex items-center gap-2">
                    For Others
                    {getTaskCountForTab("for-others") > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center"
                      >
                        {getTaskCountForTab("for-others")}
                      </Badge>
                    )}
                  </span>
                </TabsTrigger>
              </TabsList>
              <div className="relative w-full sm:w-auto">
                <SearchBar
                  contextualType="tasks"
                  data={tasks}
                  keys={['title', 'description']}
                  onResults={(results) => {
                    setSearchResults(results.map(result => result.item) as Task[]);
                  }}
                  onSearch={(value) => setSearchQuery(value)}
                  isLoading={isLoading}
                  placeholder="Search Tasks"
                  className="w-full sm:w-[300px]"
                />
              </div>
            </div>

            <Card>
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
                      <SelectItem value="User Onboarding">User Onboarding</SelectItem>
                      <SelectItem value="File Request">File Request</SelectItem>
                      <SelectItem value="Company KYB">Company KYB</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue>{scopeFilter}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Assignee Types">All Assignee Types</SelectItem>
                      <SelectItem value="User">User</SelectItem>
                      <SelectItem value="Company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-h-[400px]">
                  <TabsContent value="my-tasks" className="m-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renderTaskList()}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="for-others" className="m-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renderTaskList()}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </div>

                {!isLoading && totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
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