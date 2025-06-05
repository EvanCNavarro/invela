import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Lock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import classNames from "classnames";
import { TaskModal } from "./TaskModal";
// WebSocketTester import removed - not needed in production
import { highlightSearchMatch } from "@/components/ui/search-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  searchMatches?: any[]; // For storing search match data
}

const taskStatusMap = {
  // Support both uppercase (from server) and lowercase (from client) status values
  EMAIL_SENT: 'Email Sent',
  COMPLETED: 'Completed',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  READY_FOR_SUBMISSION: 'Ready for Submission',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  // Add lowercase versions
  email_sent: 'Email Sent',
  completed: 'Completed',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  ready_for_submission: 'Ready for Submission',
  submitted: 'Submitted',
  approved: 'Approved',
} as const;

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status.toUpperCase()) {
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

export function TaskTable({ tasks, companyOnboardingCompleted }: { 
  tasks: Task[],
  companyOnboardingCompleted?: boolean 
}) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [, navigate] = useLocation();

  // Find KYB task completion status for the company
  const isKybCompleted = (companyId: number | null): boolean => {
    if (!companyId) return false;
    return tasks.some(task => 
      task.company_id === companyId && 
      task.task_type === 'company_kyb' && 
      ['submitted', 'COMPLETED'].includes(task.status.toLowerCase())
    );
  };

  // Find Security Assessment or KY3P task completion status for the company
  const isSecurityCompleted = (companyId: number | null): boolean => {
    if (!companyId) return false;
    return tasks.some(task => 
      task.company_id === companyId && 
      (task.task_type === 'security_assessment' || task.task_type === 'sp_ky3p_assessment' || task.task_type === 'ky3p') && 
      ['submitted', 'COMPLETED'].includes(task.status.toLowerCase())
    );
  };

  const handleTaskClick = (task: Task) => {
    console.log('[TaskTable] Task clicked:', {
      id: task.id,
      title: task.title,
      type: task.task_type,
      status: task.status,
      metadata: task.metadata,
      timestamp: new Date().toISOString()
    });

    // Reset any lingering overlay issues first
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
    overlays.forEach(overlay => {
      if (overlay instanceof HTMLElement) {
        overlay.style.display = 'none';
      }
    });

    // All locking logic has been removed - all tasks are now accessible regardless of dependencies

    // Navigate to form pages for KYB, Security, KY3P, CARD, and Open Banking tasks (including submitted tasks)
    if (task.task_type === 'company_kyb' || 
        task.task_type === 'company_card' ||
        task.task_type === 'security_assessment' ||
        task.task_type === 'sp_ky3p_assessment' ||
        task.task_type === 'ky3p' ||
        task.task_type === 'open_banking' ||
        task.task_type === 'open_banking_survey') {
      
      // Get task ID for direct navigation
      const taskId = task.id;
      
      // Get task type for form type determination
      let formType;
      if (task.task_type === 'company_kyb') {
        formType = 'kyb';
      } else if (task.task_type === 'company_card') {
        formType = 'card';
      } else if (task.task_type === 'security_assessment') {
        formType = 'security';
      } else if (task.task_type === 'sp_ky3p_assessment' || task.task_type === 'ky3p') {
        formType = 'ky3p';
      } else if (task.task_type === 'open_banking' || task.task_type === 'open_banking_survey') {
        formType = 'open_banking';
      }
      
      // Get company name from task title or metadata
      let companyName = '';
      if (task.metadata?.companyName) {
        companyName = task.metadata.companyName;
      } else if (task.metadata?.company?.name) {
        companyName = task.metadata.company.name;
      } else {
        // Try to extract from title as fallback
        const match = task.title.match(/(\d+\.\s*)?(?:Company\s*)?(?:KYB|CARD|Open Banking \(1033\) Survey|Security Assessment|S&P KY3P Security Assessment)(?:\s*Form)?(?:\s*Assessment)?:\s*(.*)/i);
        if (match && match[2]) {
          companyName = match[2].trim();
        }
      }
      
      // Build task URL with both ID and semantic path structure
      let formUrl = `/task-center/task/${taskId}`;
      
      // If the task is ready for submission, append the review parameter
      // Only direct to review page if status is READY_FOR_SUBMISSION
      if (task.status.toUpperCase() === 'READY_FOR_SUBMISSION') {
        formUrl += '?review=true';
      }
      
      console.log('[TaskTable] Generated task URL:', { 
        taskId, 
        companyName, 
        formUrl,
        timestamp: new Date().toISOString()
      });

      console.log('[TaskTable] Direct task navigation preparation:', {
        taskId,
        taskType: task.task_type,
        formType,
        title: task.title,
        constructedUrl: formUrl,
        status: task.status,
        isReadyForSubmission: task.status.toUpperCase() === 'READY_FOR_SUBMISSION',
        isSubmitted: task.status.toLowerCase() === 'submitted',
        timestamp: new Date().toISOString()
      });

      // Navigate to task page
      console.log('[TaskTable] Initiating direct ID-based navigation to:', formUrl);
      navigate(formUrl);
    } else {
      console.log('[TaskTable] Opening modal for task:', {
        id: task.id,
        type: task.task_type,
        status: task.status,
        isSubmitted: task.status === 'submitted',
        timestamp: new Date().toISOString()
      });
      
      // Make sure any existing modal is closed first
      setDetailsModalOpen(false);
      
      // Small delay to ensure previous modal is fully closed
      setTimeout(() => {
        // Show modal for other task types
        setSelectedTask(task);
        setDetailsModalOpen(true);
      }, 50);
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <div className="text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M9 16l2 2 4-4"></path>
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">All Caught Up!</h3>
        <p className="text-muted-foreground text-center max-w-md">
          You have no tasks that match your current filters. Try adjusting your filters or create a new task to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} found
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              // Determine if the task is locked based on its type and prerequisites
              const isCardTask = task.task_type === 'company_card';
              const isOpenBankingTask = task.task_type === 'open_banking' || task.task_type === 'open_banking_survey';
              const isSecurityTask = task.task_type === 'security_assessment';
              const isKy3pTask = task.task_type === 'sp_ky3p_assessment' || task.task_type === 'ky3p';
              
              // All tasks are now unlocked - removed dependency checking
              const isLocked = false;
              
              // No tooltips needed since all tasks are unlocked
              const tooltipContent = null;

              return (
                <TableRow 
                  key={task.id}
                  className={classNames(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    task.task_type === 'company_kyb' && task.status !== 'submitted' && "hover:bg-blue-50/50",
                    task.searchMatches && task.searchMatches.length > 0 && "bg-yellow-50/30 dark:bg-yellow-900/10",
                    isLocked && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !isLocked && handleTaskClick(task)}
                >
                  <TableCell className="font-mono text-xs">
                    {task.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="flex items-center space-x-2">
                      {task.searchMatches ? (
                        <span 
                          dangerouslySetInnerHTML={{ 
                            __html: highlightSearchMatch(
                              task.title, 
                              task.searchMatches.filter(match => match.key === 'title')
                            ) 
                          }} 
                        />
                      ) : (
                        <span>{task.title}</span>
                      )}
                      {isLocked && tooltipContent ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="h-4 w-4 ml-2 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>{tooltipContent}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : isLocked ? (
                        <Lock className="h-4 w-4 ml-2 text-muted-foreground" />
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(task.status)}>
                      {/* Try both original case and uppercase to handle server and client status values */}
                      {taskStatusMap[task.status as keyof typeof taskStatusMap] || 
                       taskStatusMap[task.status.toUpperCase() as keyof typeof taskStatusMap] || 
                       task.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="w-full block">
                      <span className="block w-full bg-secondary h-2 rounded-full">
                        <span
                          className="block bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress < 1 ? task.progress * 100 : task.progress}%` }}
                        />
                      </span>
                      <span className="block text-xs text-muted-foreground mt-1">
                        {task.progress < 1 ? Math.ceil(task.progress * 100) : task.progress}%
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    {!isLocked && (
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
                        <DropdownMenuContent align="end" className="w-[210px]">
                          <DropdownMenuItem
                            onClick={() => {
                              // Reset any lingering overlay issues first
                              document.body.style.overflow = '';
                              document.body.style.pointerEvents = '';
                              const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
                              overlays.forEach(overlay => {
                                if (overlay instanceof HTMLElement) {
                                  overlay.style.display = 'none';
                                }
                              });
                              
                              // Make sure any existing modal is closed first
                              setDetailsModalOpen(false);
                              
                              // Small delay to ensure previous modal is fully closed
                              setTimeout(() => {
                                setSelectedTask(task);
                                setDetailsModalOpen(true);
                              }, 50);
                            }}
                            className="cursor-pointer"
                          >
                            View Details
                          </DropdownMenuItem>
                          {/* WebSocket tester removed - not needed in production */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
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