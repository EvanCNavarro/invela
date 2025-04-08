import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

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
  const modalRef = React.useRef<HTMLDivElement>(null);
  
  // Clean up any potential overlay issues when component unmounts
  React.useEffect(() => {
    if (!open) {
      // Make sure document body is scrollable
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }

    return () => {
      // Reset any potential overlay state issues
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      
      // Force reset all dialog-related elements when component unmounts
      const overlays = document.querySelectorAll('[data-state="open"][data-radix-dialog-overlay]');
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement) {
          overlay.style.display = 'none';
          overlay.setAttribute('data-state', 'closed');
        }
      });
    };
  }, [open]);

  // Create a direct close handler that bypasses animations
  const handleDirectClose = React.useCallback(() => {
    if (modalRef.current) {
      // Forcibly remove modal
      modalRef.current.style.display = 'none';
    }
    
    // Force all overlays to be closed
    const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
    overlays.forEach(overlay => {
      if (overlay instanceof HTMLElement) {
        overlay.style.display = 'none';
      }
    });
    
    // Call onOpenChange after cleanup
    onOpenChange(false);
    
    // Restore document state
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
  }, [onOpenChange]);

  if (!task) return null;

  return (
    <Dialog open={open} modal={false}>
      <DialogContent 
        ref={modalRef}
        className="sm:max-w-[600px]" 
        onEscapeKeyDown={handleDirectClose}
        onPointerDownOutside={handleDirectClose}
        onInteractOutside={handleDirectClose}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background hover:opacity-100"
          onClick={handleDirectClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
          <DialogDescription className="sr-only">Details about the task</DialogDescription>
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