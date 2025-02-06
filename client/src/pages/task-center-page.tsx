import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Search, X, PlusIcon, MoreHorizontal, User, Users2, ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, CheckCircle2, FileText, BarChart4, Info, ArrowUpDown, ArrowUp, ArrowDown, FilterX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { format, differenceInDays } from "date-fns";

interface Task {
  id: number;
  title: string;
  description: string;
  taskType: 'user_onboarding' | 'file_request';
  taskScope: 'user' | 'company';
  status: 'pending' | 'email_sent' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  assignedTo: number | null;
  createdBy: number;
  userEmail?: string;
  companyId?: number;
  companyName?: string;
  dueDate?: string;
  completionDate?: string;
  updatedAt?: string;
  createdAt: string;
}

function ProgressTracker() {
  const { user } = useAuth();
  const steps = [
    { title: "User Information", status: "completed", progress: 100 },
    { title: "Company Information", status: "completed", progress: 100 },
    { title: "Document Uploads", status: "in-progress", progress: 75 },
    { title: "File Verification", status: "pending", progress: 0 },
  ] as const;

  if (user?.onboardingCompleted) {
    return null;
  }

  return (
    <div className="rounded-md bg-background p-4 md:p-6 mb-6 border shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
        <h1 className="text-xl md:text-2xl font-semibold">Earn Accreditation for Your Company</h1>
        <div className="bg-primary/10 text-primary p-1 rounded-md self-start">
          <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Complete all the required steps to earn Invela's Accreditation for your company.</p>

      <div className="relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center mb-2",
                step.status === 'completed' ? 'bg-primary text-primary-foreground' :
                  step.status === 'in-progress' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
              )}>
                {step.status === 'completed' ? '✓' : (index + 1)}
              </div>
              <span className="text-xs md:text-sm line-clamp-2">{step.title}</span>
              {step.status === 'completed' && <span className="text-xs text-muted-foreground mt-1">Completed</span>}
              {step.status === 'in-progress' && <span className="text-xs text-primary mt-1">In Progress: {step.progress}%</span>}
            </div>
          ))}
        </div>
        <div className="absolute top-4 left-0 w-full">
          <div className="h-1 bg-muted rounded-full">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [typeFilter, setTypeFilter] = useState("All Task Types");
  const [scopeFilter, setScopeFilter] = useState("All Assignee Types");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'asc' });
  const { user } = useAuth();

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const handleSort = (key: string) => {
    setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });
  };

  const getSortedTasks = (tasks: Task[]) => {
    return [...tasks].sort((a, b) => {
      if (sortConfig.key === 'dueDate') {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      } else if (sortConfig.key === 'status') {
        return sortConfig.direction === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      } else if (sortConfig.key === 'progress') {
        return sortConfig.direction === 'asc' ? a.progress - b.progress : b.progress - a.progress;
      }
      return 0;
    });
  };

  const itemsPerPage = 10;
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All Statuses" || task.status === statusFilter.toLowerCase();
    const matchesType = typeFilter === "All Task Types" || task.taskType === typeFilter.toLowerCase();
    const matchesScope = scopeFilter === "All Assignee Types" || task.taskScope === scopeFilter.toLowerCase();

    const matchesTab = activeTab === "my-tasks"
      ? (task.assignedTo === user?.id) || (task.taskType === 'file_request' && task.createdBy === user?.id)
      : (task.taskType === 'user_onboarding' && task.createdBy === user?.id);

    return matchesSearch && matchesStatus && matchesType && matchesScope && matchesTab;
  });

  const sortedAndFilteredTasks = getSortedTasks(filteredTasks);
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
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <ProgressTracker />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Task Center</h1>
              <p className="text-sm text-muted-foreground">
                Manage and track your company's tasks and submissions.
              </p>
            </div>
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
                    {tasks.filter(task =>
                      (task.assignedTo === user?.id) ||
                      (task.taskType === 'file_request' && task.createdBy === user?.id)
                    ).length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center"
                      >
                        {tasks.filter(task =>
                          (task.assignedTo === user?.id) ||
                          (task.taskType === 'file_request' && task.createdBy === user?.id)
                        ).length}
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
                    {tasks.filter(task =>
                      task.taskType === 'user_onboarding' && task.createdBy === user?.id
                    ).length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center"
                      >
                        {tasks.filter(task =>
                          task.taskType === 'user_onboarding' && task.createdBy === user?.id
                        ).length}
                      </Badge>
                    )}
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search Tasks"
                  className="pl-9 w-full sm:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 mb-6">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] justify-between">
                      <span className="flex-grow text-left">{statusFilter}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Statuses" className="[&_[data-icon-check]]:text-primary">All Statuses</SelectItem>
                      <SelectItem value="Pending" className="[&_[data-icon-check]]:text-primary">Pending</SelectItem>
                      <SelectItem value="In Progress" className="[&_[data-icon-check]]:text-primary">In Progress</SelectItem>
                      <SelectItem value="Completed" className="[&_[data-icon-check]]:text-primary">Completed</SelectItem>
                      <SelectItem value="Failed" className="[&_[data-icon-check]]:text-primary">Failed</SelectItem>
                      <SelectItem value="Email Sent" className="[&_[data-icon-check]]:text-primary">Email Sent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px] justify-between">
                      <span className="flex-grow text-left">{typeFilter}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Task Types" className="[&_[data-icon-check]]:text-primary">All Task Types</SelectItem>
                      <SelectItem value="User Onboarding" className="[&_[data-icon-check]]:text-primary">User Onboarding</SelectItem>
                      <SelectItem value="File Request" className="[&_[data-icon-check]]:text-primary">File Request</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger className="w-[180px] justify-between">
                      <span className="flex-grow text-left">{scopeFilter}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Assignee Types" className="[&_[data-icon-check]]:text-primary">All Assignee Types</SelectItem>
                      <SelectItem value="User" className="[&_[data-icon-check]]:text-primary">User</SelectItem>
                      <SelectItem value="Company" className="[&_[data-icon-check]]:text-primary">Company</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant={hasActiveFilters ? "default" : "outline"}
                    size="default"
                    className="flex items-center gap-2 sm:w-auto w-10 h-10 shrink-0"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                  >
                    <FilterX className="h-4 w-4" />
                    <span className="hidden [@media(min-width:1200px)]:inline">Clear Filters</span>
                  </Button>
                </div>

                <div className="min-h-[400px]">
                  <TabsContent value="my-tasks" className="m-0">
                    <TaskList
                      tasks={currentTasks}
                      isLoading={isLoading}
                      error={error}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TabsContent>

                  <TabsContent value="for-others" className="m-0">
                    <TaskList
                      tasks={currentTasks}
                      isLoading={isLoading}
                      error={error}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TabsContent>
                </div>

                {!isLoading && !error && sortedAndFilteredTasks.length > 0 && (
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
                        <ChevronLeft className="h-4 w-4" />
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
                        <ChevronRight className="h-4 w-4" />
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

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  error: any;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
}

function TaskList({ tasks, isLoading, error, sortConfig, onSort }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const handleDeleteTask = async (task: Task) => {
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      toast({
        title: "Task deleted",
        description: "The task has been successfully removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDueInDays = (dueDate: string | undefined) => {
    if (!dueDate) return "-";
    const days = differenceInDays(new Date(dueDate), new Date());
    return `${days} days`;
  };

  const getTypeLabel = (type: string) => {
    return type === 'user_onboarding' ? 'New Invite' : 'File Request';
  };

  const capitalizeStatus = (status: string) => {
    return status.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTaskTitle = (task: Task) => {
    if (task.taskType === 'user_onboarding') {
      const companyMatch = task.description?.match(/to join (.*?) on the platform/);
      const companyName = companyMatch ? companyMatch[1] : 'Unknown';

      return (
        <>
          <div className="font-medium">User Onboarding:</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {task.userEmail} (employee of {companyName}) was sent a new invitation to start their onboarding on the Invela platform.
          </div>
        </>
      );
    }
    return (
      <>
        <div className="font-medium truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground line-clamp-2">{task.description}</div>
      </>
    );
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Task</TableHead>
            <TableHead>
              <button
                onClick={() => onSort('status')}
                className="flex items-center space-x-1 hover:text-primary transition-colors"
              >
                Status
                {sortConfig.key === 'status' ? (
                  sortConfig.direction === 'asc' ?
                    <ArrowUp className="h-4 w-4 text-primary" /> :
                    <ArrowDown className="h-4 w-4 text-primary" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => onSort('progress')}
                className="flex items-center space-x-1 hover:text-primary transition-colors"
              >
                Progress
                {sortConfig.key === 'progress' ? (
                  sortConfig.direction === 'asc' ?
                    <ArrowUp className="h-4 w-4 text-primary" /> :
                    <ArrowDown className="h-4 w-4 text-primary" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
              </button>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <button
                onClick={() => onSort('dueDate')}
                className="flex items-center space-x-1 hover:text-primary transition-colors"
              >
                Due In
                {sortConfig.key === 'dueDate' ? (
                  sortConfig.direction === 'asc' ?
                    <ArrowUp className="h-4 w-4 text-primary" /> :
                    <ArrowDown className="h-4 w-4 text-primary" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
              </button>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <div className="flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-destructive">
                Failed to load tasks. Please try again later.
              </TableCell>
            </TableRow>
          ) : tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <div className="max-w-[280px] group relative">
                    {formatTaskTitle(task)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    task.status === 'completed' ? 'default' :
                      task.status === 'failed' ? 'destructive' :
                        'default'
                  } className="no-hover text-center whitespace-normal">
                    {capitalizeStatus(task.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center">
                    <div className="w-full max-w-[100px]">
                      <div className="bg-secondary rounded-full h-2 w-full">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground text-center block mt-1">
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {getDueInDays(task.dueDate)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setSelectedTask(task)}>
                        View Details
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Delete Task
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Task</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this task? This will remove it from the task center and unassign it from the assigned user or company. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTask(task)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Task Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {selectedTask && (
              <>
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Basic Information
                  </h4>
                  <div className="grid gap-4">
                    <div>
                      <div className="text-sm font-medium">Title</div>
                      <div className="text-sm text-muted-foreground mt-1">{selectedTask.title}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Description</div>
                      <div className="text-sm text-muted-foreground mt-1">{selectedTask.description}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                    <BarChart4 className="h-4 w-4 text-muted-foreground" />
                    Status & Progress
                  </h4>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium">Type</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {getTypeLabel(selectedTask.taskType)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Status</div>
                        <Badge variant={
                          selectedTask.status === 'completed' ? 'default' :
                            selectedTask.status === 'failed' ? 'destructive' :
                              'default'
                        } className="mt-1">
                          {capitalizeStatus(selectedTask.status)}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Progress</div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${selectedTask.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {selectedTask.progress}% Complete
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Timing Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Created On</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedTask.createdAt ? format(new Date(selectedTask.createdAt), 'PPP') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Due Date</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'PPP') : '-'}
                      </div>
                    </div>
                    {selectedTask.completionDate && (
                      <div>
                        <div className="text-sm font-medium">Completed On</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(selectedTask.completionDate), 'PPP')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}