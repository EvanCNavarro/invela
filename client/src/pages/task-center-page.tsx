import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown, Download, PlusIcon } from "lucide-react";
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

interface Task {
  id: number;
  title: string;
  status: 'completed' | 'pending';
  assignedTo: string;
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

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || task.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ProgressTracker />

        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold">Task Center</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your company's tasks and submissions.
          </p>
        </div>

        <div className="bg-background rounded-md border">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="w-full md:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search Tasks & Files"
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New Task
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
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Advanced search
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setTimeFilter("Last 6 months");
                    setStatusFilter("All Status");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">
                    <input type="checkbox" className="h-4 w-4 rounded-sm border-border" />
                  </TableHead>
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
                  <TableHead className="hidden md:table-cell w-[25%]">Last Change</TableHead>
                  <TableHead className="text-right w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">
                      Failed to load tasks. Please try again later.
                    </TableCell>
                  </TableRow>
                ) : filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="w-[48px]">
                        <input type="checkbox" className="h-4 w-4 rounded-sm border-border" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-xs text-muted-foreground">To: {task.assignedTo}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        )}>
                          {task.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(task.updatedAt || task.createdAt).toLocaleDateString()}
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
        </div>
      </div>
    </DashboardLayout>
  );
}