import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown, Download } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const taskFormSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().optional(),
  status: z.string(),
  dueDate: z.string().optional(),
});

function ProgressTracker() {
  const steps = [
    { title: "User Information", status: "completed", progress: 100 },
    { title: "Company Information", status: "completed", progress: 100 },
    { title: "Document Uploads", status: "in-progress", progress: 75 },
    { title: "File Verification", status: "pending", progress: 0 },
    { title: "Unlock Invela", status: "pending", progress: 0 },
  ];

  return (
    <div className="bg-background rounded-lg p-6 mb-6 border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Earn Accreditation for Your Company</h2>
        <div className="bg-primary/10 text-primary p-1 rounded">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <p className="text-muted-foreground mb-8">Complete all the required steps to earn Invela's Accreditation for your company.</p>

      <div className="relative">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center w-48">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2
                ${step.status === 'completed' ? 'bg-primary text-primary-foreground' :
                  step.status === 'in-progress' ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'}`}>
                {step.status === 'completed' ? '✓' : (index + 1)}
              </div>
              <span className="text-sm text-center">{step.title}</span>
              {step.status === 'completed' && <span className="text-xs text-muted-foreground">Completed</span>}
              {step.status === 'in-progress' && <span className="text-xs text-primary">In Progress: {step.progress}%</span>}
            </div>
          ))}
        </div>
        <div className="absolute top-4 left-0 w-full">
          <div className="h-1 bg-muted rounded">
            <div className="h-full bg-primary rounded" style={{ width: '50%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("Last 6 months");
  const [statusFilter, setStatusFilter] = useState("All");
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
    },
  });

  const filteredTasks = tasks.filter((task: any) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || task.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ProgressTracker />

        <div className="bg-background rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Tasks & Files"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[180px]">
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
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline">
                Advanced search
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" className="ml-4">
              Clear
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Change</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">To: {task.assignedTo}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                        {task.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(task.updatedAt || task.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}