import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { TaskStatus } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { unifiedWebSocketService } from "@/services/websocket-unified";
import { Wifi, WifiOff } from "lucide-react";

interface TaskDetailsModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const taskStatusMap = {
  EMAIL_SENT: 'Email Sent',
  COMPLETED: 'Completed',
} as const;

const statusProgressMap = {
  EMAIL_SENT: 25,
  COMPLETED: 100,
  SUBMITTED: 100, // Added SUBMITTED to have same progress as COMPLETED
} as const;

const formatDate = (date: Date) => format(date, 'MMM d, yyyy');

export function TaskDetailsModal({ task: initialTask, open, onOpenChange }: TaskDetailsModalProps) {
  const [task, setTask] = useState(initialTask);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    setIsConnected(unifiedWebSocketService.isConnected());
    unifiedWebSocketService.connect().catch(console.error);
    
    const unsubscribeConnection = unifiedWebSocketService.subscribe('connection_status', (data: any) => {
      setIsConnected(data.connected === true);
    });
    
    return unsubscribeConnection;
  }, []);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    if (!isConnected || !task) return;

    console.log('[TaskDetailsModal] Setting up unified WebSocket listeners for task:', task.id);

    const handleTaskUpdate = (data: any) => {
      try {
        if (data.type === 'task_update' && data.payload?.taskId === task.id) {
          console.log('[TaskDetailsModal] Received task update:', data.payload);
          setTask(current => ({
            ...current,
            status: data.payload.status,
            progress: statusProgressMap[data.payload.status as TaskStatus] || current.progress
          }));
        }
      } catch (error) {
        console.error('[TaskDetailsModal] Error handling task update:', error);
      }
    };

    const unsubscribe = unifiedWebSocketService.subscribe('task_update', handleTaskUpdate);

    return () => {
      console.log('[TaskDetailsModal] Cleaning up unified WebSocket listeners for task:', task.id);
      unsubscribe();
    };
  }, [isConnected, task]);

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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {taskStatusMap[task.status as TaskStatus] || task.status}
          </Badge>
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
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