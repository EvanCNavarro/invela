import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import classNames from "classnames";
import { TaskModal } from "./TaskModal";

interface Task {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  task_scope: string;
  status: string;
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

const taskStatusMap = {
  EMAIL_SENT: 'Email Sent',
  COMPLETED: 'Completed',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  READY_FOR_SUBMISSION: 'Ready for Submission',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
} as const;

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status.toUpperCase()) {
    case 'NOT_STARTED':
    case 'EMAIL_SENT':
      return "secondary";
    case 'COMPLETED':
    case 'APPROVED':
      return "default";
    case 'IN_PROGRESS':
    case 'READY_FOR_SUBMISSION':
    case 'SUBMITTED':
      return "outline";
    default:
      return "default";
  }
};

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [, navigate] = useLocation();

  const handleTaskClick = (task: Task) => {
    console.log('[TaskTable] Task clicked:', {
      id: task.id,
      title: task.title,
      type: task.task_type,
      status: task.status,
      metadata: task.metadata,
    });

    // Navigate to form pages for KYB and CARD tasks if not in submitted status
    if ((task.task_type === 'company_kyb' || task.task_type === 'company_card') && task.status !== 'submitted') {
      // Get company name from metadata or task title
      const companyName = task.metadata?.company_name || 
                         task.title.replace(/Company (KYB|CARD): /, '');

      // Build the URL based on task type
      const taskTypePrefix = task.task_type === 'company_kyb' ? 'kyb' : 'card';
      const formUrl = `/task-center/task/${taskTypePrefix}-${companyName}`;

      console.log(`[TaskTable] Preparing navigation:`, {
        taskType: task.task_type,
        originalTitle: task.title,
        extractedCompanyName: companyName,
        taskTypePrefix,
        constructedUrl: formUrl,
        metadata: task.metadata,
      });

      // Navigate to form page
      navigate(formUrl);
    } else {
      console.log('[TaskTable] Opening modal for task:', {
        id: task.id,
        type: task.task_type,
        status: task.status,
      });
      // Show modal for other task types or submitted KYB/CARD tasks
      setSelectedTask(task);
      setDetailsModalOpen(true);
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks found
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow 
                key={task.id}
                className={classNames(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  task.task_type === 'company_kyb' && task.status !== 'submitted' && "hover:bg-blue-50/50"
                )}
                onClick={() => handleTaskClick(task)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <span>{task.title}</span>
                    {task.task_type === 'company_kyb' && (
                      <Badge variant="outline" className="ml-2">KYB</Badge>
                    )}
                  </div>
                </TableCell>
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
                  {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 hover:bg-accent"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailsModalOpen(true);
                        }}
                        className="cursor-pointer"
                      >
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TaskModal
        task={selectedTask}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </>
  );
}