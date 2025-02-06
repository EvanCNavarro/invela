import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown, Download, PlusIcon, Filter, Users, User } from "lucide-react";
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

interface Task {
  id: number;
  title: string;
  description: string;
  taskType: 'user_onboarding' | 'file_request';
  taskScope: 'user' | 'company';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  assignedTo: string;
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
  const [timeFilter, setTimeFilter] = useState("Last 6 months");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [scopeFilter, setScopeFilter] = useState("All Scopes");
  const { user } = useAuth();

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({ 
    queryKey: ["/api/tasks"],
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || task.status === statusFilter.toLowerCase();
    const matchesType = typeFilter === "All Types" || task.taskType === typeFilter.toLowerCase();
    const matchesScope = scopeFilter === "All Scopes" || task.taskScope === scopeFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesType && matchesScope;
  });

  const myTasks = filteredTasks.filter(task => task.assignedTo === user?.id);
  const teamTasks = filteredTasks.filter(task => task.assignedTo !== user?.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ProgressTracker />

        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold mb-1">Task Center</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your company's tasks and submissions.
          </p>
        </div>

        <Tabs defaultValue="my-tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="my-tasks" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              My Tasks
            </TabsTrigger>
            <TabsTrigger value="team-tasks" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Tasks
            </TabsTrigger>
          </TabsList>

          <div className="bg-background rounded-md p-4 md:p-6 border">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="w-full md:max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search Tasks"
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>

              <div className="flex flex-wrap gap-4">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Last 6 months">Last 6 months</SelectItem>
                    <SelectItem value="Last year">Last year</SelectItem>
                    <SelectItem value="All time">All time</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Status">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Types">All Types</SelectItem>
                    <SelectItem value="User Onboarding">User Onboarding</SelectItem>
                    <SelectItem value="File Request">File Request</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Scopes">All Scopes</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setTimeFilter("Last 6 months");
                    setStatusFilter("All Status");
                    setTypeFilter("All Types");
                    setScopeFilter("All Scopes");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <TabsContent value="my-tasks">
              <TaskList tasks={myTasks} isLoading={isLoading} error={error} />
            </TabsContent>

            <TabsContent value="team-tasks">
              <TaskList tasks={teamTasks} isLoading={isLoading} error={error} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function TaskList({ tasks, isLoading, error }: { tasks: Task[], isLoading: boolean, error: any }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]">
              <input type="checkbox" className="rounded-sm border-gray-300" />
            </TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="hidden md:table-cell">Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-destructive">
                Failed to load tasks. Please try again later.
              </TableCell>
            </TableRow>
          ) : tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <input type="checkbox" className="rounded-sm border-gray-300" />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-muted-foreground">{task.description}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={task.taskType === 'user_onboarding' ? 'default' : 'secondary'}>
                    {task.taskType === 'user_onboarding' ? 'Onboarding' : 'File Request'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    task.status === 'completed' ? 'success' :
                    task.status === 'in_progress' ? 'warning' :
                    task.status === 'failed' ? 'destructive' :
                    'default'
                  }>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {task.progress}%
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}