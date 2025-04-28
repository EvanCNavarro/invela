import * as React from "react";
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
  // Support both lowercase and uppercase status values
  email_sent: 'Email Sent',
  completed: 'Completed',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  ready_for_submission: 'Ready for Submission',
  submitted: 'Submitted',
  approved: 'Approved',
  // Add uppercase versions for consistency with server
  EMAIL_SENT: 'Email Sent',
  COMPLETED: 'Completed',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  READY_FOR_SUBMISSION: 'Ready for Submission',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
} as const;

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  // Convert to uppercase for case-insensitive matching
  const upperStatus = status.toUpperCase();
  
  switch (upperStatus) {
    case 'NOT_STARTED':
    case 'EMAIL_SENT':
      return "secondary";
    case 'COMPLETED':
    case 'APPROVED':
    case 'SUBMITTED':  // Added SUBMITTED to use the same style as COMPLETED
      return "default";
    case 'IN_PROGRESS':
    case 'READY_FOR_SUBMISSION':
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
  const [isClosing, setIsClosing] = React.useState(false);
  
  // Reset modal state when task changes
  React.useEffect(() => {
    if (task && open) {
      setIsClosing(false);
    }
  }, [task, open]);

  // Handle outside clicks
  React.useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);
  
  // Handle escape key
  React.useEffect(() => {
    if (!open) return;
    
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onOpenChange(false);
      setIsClosing(false);
    }, 150);
  };

  if (!task || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        style={{transitionDuration: '150ms'}}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`bg-white dark:bg-slate-950 z-50 rounded-lg shadow-lg p-6 max-w-[600px] w-full max-h-[90vh] overflow-auto transition-all ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={{transitionDuration: '150ms'}}
      >
        {/* Close button */}
        <button
          className="absolute right-4 top-4 rounded-sm p-1 opacity-70 ring-offset-background hover:opacity-100"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{task.title}</h2>
        </div>

        <div className="space-y-6">
          {/* Status and Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={getStatusVariant(task.status)}>
                {/* Try both original case and uppercase to handle server and client status values */}
                {taskStatusMap[task.status as keyof typeof taskStatusMap] || 
                 taskStatusMap[task.status.toUpperCase() as keyof typeof taskStatusMap] || 
                 task.status.replace(/_/g, ' ')}
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
      </div>
    </div>
  );
}