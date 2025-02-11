import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { TaskDetailsModal } from "@/components/modals/TaskDetailsModal";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@db/schema";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { wsService } from "@/lib/websocket";

// Define the task status flow
const taskStatusFlow = {
  [TaskStatus.EMAIL_SENT]: {
    next: TaskStatus.IN_PROGRESS,
    progress: 25,
  },
  [TaskStatus.IN_PROGRESS]: {
    next: TaskStatus.COMPLETED,
    progress: 50,
  },
  [TaskStatus.COMPLETED]: {
    next: null,
    progress: 100,
  },
} as const;

const taskStatusMap = {
  [TaskStatus.EMAIL_SENT]: 'Email Sent',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.COMPLETED]: 'Completed',
} as const;

// Define progress values for each status
const STATUS_PROGRESS = {
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.IN_PROGRESS]: 50,
  [TaskStatus.COMPLETED]: 100,
} as const;

interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  progress?: number;
  dueDate?: string | Date;
}

interface TaskCount {
  total: number;
  emailSent: number;
  inProgress: number;
  completed: number;
}

export function TaskTable({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskCounts, setTaskCounts] = useState<TaskCount>({
    total: initialTasks.length,
    emailSent: initialTasks.filter(t => t.status === TaskStatus.EMAIL_SENT).length,
    inProgress: initialTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    completed: initialTasks.filter(t => t.status === TaskStatus.COMPLETED).length
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Add mutation for updating task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: number; newStatus: TaskStatus }) => {
      return apiRequest(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  // Set up WebSocket subscription for real-time updates
  useEffect(() => {
    // Subscribe to task updates
    const unsubscribeTaskUpdate = wsService.subscribe('task_updated', (data) => {
      setTasks(currentTasks =>
        currentTasks.map(task =>
          task.id === data.taskId
            ? { ...task, status: data.status, progress: data.progress }
            : task
        )
      );
      if (data.count) setTaskCounts(data.count);
    });

    // Subscribe to task creation
    const unsubscribeTaskCreate = wsService.subscribe('task_created', (data) => {
      setTasks(currentTasks => [...currentTasks, data.task]);
      if (data.count) setTaskCounts(data.count);
    });

    // Subscribe to task deletion
    const unsubscribeTaskDelete = wsService.subscribe('task_deleted', (data) => {
      setTasks(currentTasks => currentTasks.filter(task => task.id !== data.taskId));
      if (data.count) setTaskCounts(data.count);
    });

    // Clean up subscriptions on unmount
    return () => {
      unsubscribeTaskUpdate();
      unsubscribeTaskCreate();
      unsubscribeTaskDelete();
    };
  }, []);

  // Update tasks when initialTasks changes
  useEffect(() => {
    setTasks(initialTasks);
    setTaskCounts({
      total: initialTasks.length,
      emailSent: initialTasks.filter(t => t.status === TaskStatus.EMAIL_SENT).length,
      inProgress: initialTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: initialTasks.filter(t => t.status === TaskStatus.COMPLETED).length
    });
  }, [initialTasks]);

  // Get progress based on status, fallback to actual progress value if exists
  const getProgress = (task: Task) => {
    return STATUS_PROGRESS[task.status as TaskStatus] ?? task.progress ?? 0;
  };

  // Handle status transition
  const handleStatusUpdate = async (task: Task) => {
    const nextStatus = taskStatusFlow[task.status]?.next;
    if (!nextStatus) return;

    try {
      await updateTaskStatus.mutateAsync({
        taskId: task.id,
        newStatus: nextStatus,
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

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
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => handleStatusUpdate(task)}
                  >
                    {taskStatusMap[task.status] || task.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-full bg-secondary h-2 rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgress(task)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {getProgress(task)}%
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
                      {taskStatusFlow[task.status]?.next && (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(task)}
                          className="cursor-pointer"
                        >
                          Update Status
                        </DropdownMenuItem>
                      )}
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