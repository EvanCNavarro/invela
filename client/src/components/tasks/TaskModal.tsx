import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { FixedDialog } from "@/components/ui/fixed-dialog";

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
  email_sent: 'Email Sent',
  completed: 'Completed',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  ready_for_submission: 'Ready for Submission',
  submitted: 'Submitted',
  approved: 'Approved',
} as const;

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'not_started':
    case 'email_sent':
      return "secondary";
    case 'completed':
    case 'approved':
    case 'submitted':  // Added submitted to use the same style as completed
      return "default";
    case 'in_progress':
    case 'ready_for_submission':
      return "outline";
    default:
      return "default";
  }
};

interface TaskModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskModal({ task, open, onOpenChange }: TaskModalProps) {
  if (!task) return null;

  return (
    <FixedDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title={<span className="text-xl font-semibold">{task.title}</span>}
      description="Details about the task"
      className="sm:max-w-[600px]"
    >
      <div className="space-y-6 py-4">
        {/* Status and Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant={getStatusVariant(task.status)}>
              {taskStatusMap[task.status as keyof typeof taskStatusMap] || task.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {task.progress}% Complete
            </span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>

        {/* Task Details */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Description</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>

          {task.user_email && (
            <div>
              <h3 className="font-medium mb-1">Assigned To</h3>
              <p className="text-sm text-muted-foreground">{task.user_email}</p>
            </div>
          )}

          {task.due_date && (
            <div>
              <h3 className="font-medium mb-1">Due Date</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(task.due_date), 'PPP')}
              </p>
            </div>
          )}

          {/* Files Section */}
          {task.files_requested && task.files_requested.length > 0 && (
            <div>
              <h3 className="font-medium mb-1">Required Files</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {task.files_requested.map((file: string, index: number) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </FixedDialog>
  );
}