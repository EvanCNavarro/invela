import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { TaskStatus } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { wsService } from "@/lib/websocket";

interface TaskDetailsModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const taskStatusMap = {
  [TaskStatus.EMAIL_SENT]: 'Email Sent',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.COMPLETED]: 'Completed',
} as const;

const statusProgressMap = {
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.IN_PROGRESS]: 50,
  [TaskStatus.COMPLETED]: 100,
} as const;

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');

export function TaskDetailsModal({ task: initialTask, open, onOpenChange }: TaskDetailsModalProps) {
  const [task, setTask] = useState(initialTask);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    if (!task) return;

    const setupWebSocket = async () => {
      try {
        const unsubscribe = await wsService.subscribe('task_status_updated', (data) => {
          if (data.taskId === task.id) {
            setTask(current => ({
              ...current,
              status: data.status,
              progress: statusProgressMap[data.status as TaskStatus]
            }));
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up WebSocket subscription:', error);
      }
    };

    const unsubscribePromise = setupWebSocket();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch (error) {
            console.error('Error unsubscribing from WebSocket:', error);
          }
        }
      });
    };
  }, [task]);

  if (!task) return null;

  // Ensure progress is always synced with status
  const progress = task.status ? statusProgressMap[task.status as TaskStatus] : task.progress ?? 0;

  const taskFields = [
    { label: "Task ID", value: task.id },
    { label: "Title", value: task.title },
    { label: "Description", value: task.description },
    { 
      label: "Status", 
      value: (
        <Badge variant="secondary">
          {taskStatusMap[task.status as TaskStatus] || task.status}
        </Badge>
      )
    },
    { 
      label: "Progress", 
      value: (
        <div className="flex items-center gap-2">
          <Progress value={progress} className="w-[60%]" />
          <span>{progress}%</span>
        </div>
      )
    },
    { label: "Created By", value: task.createdBy },
    { label: "User Email", value: task.userEmail },
    { label: "Company ID", value: task.companyId },
    { label: "Due Date", value: task.dueDate ? formatDate(new Date(task.dueDate)) : "Not set" },
    { label: "Created At", value: formatDate(new Date(task.createdAt)) },
    { label: "Updated At", value: formatDate(new Date(task.updatedAt)) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {taskFields.map((field, index) => (
              <div key={index}>
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-muted-foreground">{field.label}</div>
                  <div className="col-span-2">{field.value}</div>
                </div>
                {index < taskFields.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}