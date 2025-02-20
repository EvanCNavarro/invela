import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { TaskDetailsModal } from "@/components/modals/TaskDetailsModal";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@db/schema";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import cn from 'classnames';

interface Task {
  id: number;
  title: string;
  description: string;
  taskType: 'user_onboarding' | 'file_request' | 'user_invitation' | 'company_kyb';
  taskScope: 'user' | 'company';
  status: TaskStatus;
  progress: number;
  assignedTo?: number;
  createdBy: number;
  userEmail?: string;
  companyId?: number;
  dueDate?: string;
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

export function TaskTable({ tasks: initialTasks }: { tasks: Task[] }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add mutation for updating task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: number; newStatus: TaskStatus }) => {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task Updated",
        description: "The task status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to update task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Show loading state
  if (!initialTasks || initialTasks.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
          No tasks found
        </TableCell>
      </TableRow>
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
            {initialTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                  <Badge
                    variant={task.status === TaskStatus.COMPLETED ? "default" : "secondary"}
                    className={cn(
                      "cursor-pointer hover:bg-secondary/80",
                      task.status === TaskStatus.COMPLETED && "bg-green-100"
                    )}
                  >
                    {taskStatusMap[task.status] || task.status}
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
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right pr-4">
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

      <TaskDetailsModal
        task={selectedTask}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </>
  );
}