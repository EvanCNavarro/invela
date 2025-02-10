import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { TaskStatus } from "@db/schema";

interface TaskDetailsModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const taskStatusMap = {
  [TaskStatus.EMAIL_SENT]: 'Email Sent',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.COMPLETED]: 'Completed',
  pending: 'Email Sent', // Backward compatibility for existing tasks
};

export function TaskDetailsModal({ task, open, onOpenChange }: TaskDetailsModalProps) {
  if (!task) return null;

  const taskFields = [
    { label: "Task ID", value: task.id },
    { label: "Title", value: task.title },
    { label: "Description", value: task.description },
    { label: "Type", value: task.taskType },
    { label: "Scope", value: task.taskScope },
    { label: "Status", value: taskStatusMap[task.status] || task.status },
    { label: "Priority", value: task.priority },
    { label: "Progress", value: `${task.progress}%` },
    { label: "Created By", value: task.createdBy },
    { label: "User Email", value: task.userEmail },
    { label: "Company ID", value: task.companyId },
    { label: "Due Date", value: task.dueDate ? formatDate(new Date(task.dueDate)) : "Not set" },
    { label: "Created At", value: formatDate(new Date(task.createdAt)) },
    { label: "Updated At", value: formatDate(new Date(task.updatedAt)) },
    { label: "Files Requested", value: task.filesRequested?.length || 0 },
    { label: "Files Uploaded", value: task.filesUploaded?.length || 0 }
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