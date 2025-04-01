import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Lock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import classNames from "classnames";
import { TaskModal } from "./TaskModal";
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
  EMAIL_SENT: 'Email Sent',
  COMPLETED: 'Completed',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  READY_FOR_SUBMISSION: 'Ready for Submission',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
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
      task.task_type === 'company_onboarding_KYB' && 
      ['submitted', 'COMPLETED'].includes(task.status.toLowerCase())
    );
  };

  // Find Security Assessment task completion status for the company
  const isSecurityCompleted = (companyId: number | null): boolean => {
    if (!companyId) return false;
    return tasks.some(task => 
      task.company_id === companyId && 
      task.task_type === 'security_assessment' && 
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

    // Check if Security Assessment task is locked (needs KYB to be completed)
    if (task.task_type === 'security_assessment' && !isKybCompleted(task.company_id)) {
      console.log('[TaskTable] Security Assessment task locked - KYB not completed');
      return; // Prevent navigation
    }

    // Check if CARD task is locked (needs both KYB and Security Assessment to be completed)
    if (task.task_type === 'company_card' && 
        (!isKybCompleted(task.company_id) || !isSecurityCompleted(task.company_id))) {
      console.log('[TaskTable] CARD task locked - prerequisite tasks not completed');
      return; // Prevent navigation
    }

    // Navigate to form pages for KYB, Security and CARD tasks if not in submitted status
    if ((task.task_type === 'company_kyb' || 
         task.task_type === 'company_onboarding_KYB' || 
         task.task_type === 'company_card' ||
         task.task_type === 'security_assessment') && 
        task.status !== 'submitted') {
      
      // Get task ID for direct navigation
      const taskId = task.id;
      
      // Get task type for form type determination
      let formType;
      if (task.task_type === 'company_kyb' || task.task_type === 'company_onboarding_KYB') {
        formType = 'kyb';
      } else if (task.task_type === 'company_card') {
        formType = 'card';
      } else if (task.task_type === 'security_assessment') {
        formType = 'security';
      }
      
      // Build direct task URL with ID
      let formUrl = `/task/${taskId}`;
      
      // If the task is ready for submission, append the review parameter
      if (task.status.toUpperCase() === 'READY_FOR_SUBMISSION') {
        formUrl += '?review=true';
      }

      console.log('[TaskTable] Direct task navigation preparation:', {
        taskId,
        taskType: task.task_type,
        formType,
        title: task.title,
        constructedUrl: formUrl,
        status: task.status,
        isReadyForSubmission: task.status.toUpperCase() === 'READY_FOR_SUBMISSION',
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
      // Show modal for other task types or submitted KYB/CARD tasks
      setSelectedTask(task);
      setDetailsModalOpen(true);
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks found
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              // Determine if the task is locked based on its type and prerequisites
              const isCardTask = task.task_type === 'company_card';
              const isSecurityTask = task.task_type === 'security_assessment';
              
              // Check locked status based on task type and prerequisites
              const isLocked = 
                (isSecurityTask && !isKybCompleted(task.company_id)) || 
                (isCardTask && (!isKybCompleted(task.company_id) || !isSecurityCompleted(task.company_id))) ||
                // Also consider the locked flag in metadata if it exists
                (task.metadata?.locked === true);

              return (
                <TooltipProvider key={task.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TableRow 
                        className={classNames(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          task.task_type === 'company_onboarding_KYB' && task.status !== 'submitted' && "hover:bg-blue-50/50",
                          task.searchMatches && task.searchMatches.length > 0 && "bg-yellow-50/30 dark:bg-yellow-900/10",
                          isLocked && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !isLocked && handleTaskClick(task)}
                      >
                        <TableCell className="font-mono text-xs">
                          {task.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
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
                            {isLocked && (
                              <Lock className="h-4 w-4 ml-2 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(task.status)}>
                            {taskStatusMap[task.status as keyof typeof taskStatusMap] || task.status.replace(/_/g, ' ')}
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
                          {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
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
                          )}
                        </TableCell>
                      </TableRow>
                    </TooltipTrigger>
                    {isLocked && (
                      <TooltipContent>
                        {isSecurityTask && (
                          <p>Complete the KYB form to unlock this Security Assessment task</p>
                        )}
                        {isCardTask && (
                          <p>Complete both KYB and Security Assessment tasks to unlock this CARD task</p>
                        )}
                        {!isCardTask && !isSecurityTask && task.metadata?.locked && (
                          <p>This task is locked due to dependencies</p>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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