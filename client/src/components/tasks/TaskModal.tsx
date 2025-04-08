import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

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
  // Handle keyboard events to ensure we don't trap focus
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  // Properly handle modal cleanup
  useEffect(() => {
    // Add keyboard event listener when modal opens
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup function to properly remove listeners and restore focus
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Extra cleanup to ensure no lingering focus trap
      if (open) {
        // Small delay to ensure DOM operations complete
        setTimeout(() => {
          // Try to find the main content area to restore focus
          const mainContent = document.getElementById('main-content') || document.body;
          if (mainContent) {
            mainContent.setAttribute('tabindex', '-1');
            mainContent.focus();
            // Remove tabindex after focus to not interfere with normal tab flow
            setTimeout(() => mainContent.removeAttribute('tabindex'), 0);
          }
        }, 100);
      }
    };
  }, [open, handleKeyDown]);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(newState) => {
      // Ensure we clear any focus issues when closing
      if (!newState) {
        // Small timeout to allow animation to complete
        setTimeout(() => {
          onOpenChange(newState);
        }, 50);
      } else {
        onOpenChange(newState);
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
          {/* Add DialogDescription to fix missing description warning */}
          <DialogDescription className="sr-only">
            Details about the task
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}