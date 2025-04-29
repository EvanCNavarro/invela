import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, FileText, ArrowRight, Shield, Check, Archive } from "lucide-react";
import { useEffect, useState } from "react";

export interface SubmissionResult {
  fileId?: number;
  downloadUrl?: string;
  taskId?: number;
  taskStatus?: string;
  nextTaskId?: number;
  riskScore?: number;
  completedActions?: SubmissionAction[];
  // For KYB responses which may contain nested data property
  data?: {
    fileId?: number;
    downloadUrl?: string;
    [key: string]: any; // Other data properties
  };
  // Add other task-specific fields here
}

export interface SubmissionAction {
  type: string;       // Type of action: "task_completion", "file_generation", etc.
  description: string; // Human-readable description
  icon?: string;      // Icon name for this action
  data?: {
    details: string;   // Human-readable details about this action
    buttonText?: string; // Optional button text for navigation actions
    url?: string;      // Optional URL for navigation actions
    fileId?: number;   // Optional file ID for file-related actions
  };
  fileId?: number;    // Optional file ID passed directly for CSV or PDF files
}

interface UniversalSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskType: string;
  companyName: string;
  submissionResult: SubmissionResult;
}

/**
 * A reusable success modal component that can be used for any form submission
 * across different task types. The modal content adapts based on the tasks performed
 * during submission (tracked in submissionResult.completedActions).
 */
export function UniversalSuccessModal({ 
  open, 
  onOpenChange, 
  taskType, 
  companyName,
  submissionResult
}: UniversalSuccessModalProps) {
  const [, navigate] = useLocation();
  const [titleText, setTitleText] = useState("Form Submitted Successfully");
  
  // Play a single celebratory confetti animation when modal opens
  useEffect(() => {
    if (open) {
      // Add a small delay to ensure modal is visible first
      const animationTimeout = setTimeout(() => {
        // Import and use confetti dynamically
        import('canvas-confetti').then(confetti => {
          // Create a single celebration effect behind the modal
          confetti.default({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#26a69a', '#00838f', '#00acc1', '#00bcd4', '#4965EC', '#0068FF'],
            startVelocity: 30,
            gravity: 1.2,
            ticks: 60,
            shapes: ['circle', 'square'],
            scalar: 0.8,
            zIndex: -1 // Ensure confetti appears behind the modal
          });
        });
      }, 100); // Quick delay to ensure modal has started appearing

      // Clean up timeout if modal is closed
      return () => clearTimeout(animationTimeout);
    }
  }, [open]);
  
  // Determine the appropriate title based on task type
  useEffect(() => {
    switch(taskType) {
      case "kyb":
      case "company_kyb":
        setTitleText("KYB Form Complete");
        break;
      case "security":
        setTitleText("Security Assessment Complete");
        break;
      case "sp_ky3p_assessment":
        setTitleText("S&P KY3P Security Assessment Complete");
        break;
      case "card":
        setTitleText("Open Banking (1033) Survey Complete");
        break;
      default:
        setTitleText("Form Submitted Successfully");
    }
  }, [taskType]);
  
  // Helper function to get the appropriate action cards based on completed actions
  const getActionCards = () => {
    // Default actions - always show "task completed" if no specific actions provided
    if (!submissionResult.completedActions || submissionResult.completedActions.length === 0) {
      return [
        <div key="task-completed" className="flex items-start gap-3 border rounded-md p-3 bg-green-50 border-green-200">
          <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Task Completed</p>
            <p className="text-gray-600">Your form has been successfully submitted and marked as complete.</p>
          </div>
        </div>
      ];
    }
    
    // Map the completed actions to UI cards
    return submissionResult.completedActions.map((action, index) => {
      // Select icon based on action type
      let ActionIcon = FileText;
      let bgClass = "bg-white";
      let borderClass = "border-gray-200";
      let iconColor = "text-gray-600";
      
      // Customize appearance based on action type
      switch(action.type) {
        case "task_completion":
          ActionIcon = Check;
          bgClass = "bg-green-50";
          borderClass = "border-green-200";
          iconColor = "text-green-600";
          break;
        case "file_generation":
          ActionIcon = FileText;
          // White background for middle components
          bgClass = "bg-white";
          borderClass = "border-gray-200";
          iconColor = "text-gray-600";
          break;
        case "file_vault_unlocked":
          // Use the Archive icon from lucide-react
          ActionIcon = Archive;
          // White background for middle components
          bgClass = "bg-white";
          borderClass = "border-gray-200";
          iconColor = "text-gray-600";
          break;
        case "next_task":
          ActionIcon = ArrowRight;
          bgClass = "bg-indigo-50";
          borderClass = "border-indigo-200";
          iconColor = "text-indigo-600";
          break;
        case "risk_assessment":
          ActionIcon = Shield;
          // White background for middle components
          bgClass = "bg-white";
          borderClass = "border-gray-200";
          iconColor = "text-gray-600";
          break;
      }
      
      return (
        <div key={`action-${index}`} className={`flex items-start gap-3 border rounded-md p-3 ${bgClass} ${borderClass}`}>
          <ActionIcon className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
          <div>
            <p className="font-medium text-gray-900">{action.description}</p>
            {action.data?.details && (
              <p className="text-gray-600">{action.data.details}</p>
            )}
          </div>
        </div>
      );
    });
  };
  
  // Determine the best action buttons based on completed actions
  const getActionButtons = () => {
    const buttons = [];
    
    // File download button (if a file was generated)
    const fileAction = submissionResult.completedActions?.find(a => a.type === "file_generation");
    const hasFileAction = fileAction || submissionResult.fileId || submissionResult.downloadUrl;
    // Look for fileId in different locations, including nested in a data property if it's from the KYB response
    const hasFileId = fileAction?.fileId || fileAction?.data?.fileId || submissionResult.fileId || 
                      (submissionResult.data && typeof submissionResult.data === 'object' ? submissionResult.data.fileId : undefined);
    
    if (hasFileAction || hasFileId) {
      // First, add a direct download button for this specific file
      if (hasFileId) {
        // Get the fileId from any of the possible locations
        const fileId = fileAction?.fileId || fileAction?.data?.fileId || submissionResult.fileId || 
                      (submissionResult.data && typeof submissionResult.data === 'object' ? submissionResult.data.fileId : undefined);
        const buttonText = fileAction?.data?.buttonText || "Download File";
        
        buttons.push(
          <Button
            key="download-file"
            variant="outline" 
            onClick={() => {
              // Use the /api/files/:id/download endpoint for direct download
              window.open(`/api/files/${fileId}/download`, '_blank');
            }}
            className="flex-1"
          >
            {buttonText}
          </Button>
        );
      }
      
      // Also include a button to navigate to the file vault
      buttons.push(
        <Button
          key="view-files"
          variant="outline"
          onClick={() => {
            navigate('/file-vault');
            onOpenChange(false);
          }}
          className="flex-1"
        >
          View File Vault
        </Button>
      );
    }
    
    // Next task button (if a next task is available)
    const nextTaskAction = submissionResult.completedActions?.find(a => a.type === "next_task");
    if (nextTaskAction) {
      buttons.push(
        <Button
          key="next-task"
          onClick={() => {
            navigate(nextTaskAction.data?.url || '/task-center');
            onOpenChange(false);
          }}
          className="flex-1"
        >
          {nextTaskAction.data?.buttonText || "Go to Next Task"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      );
    } else {
      // Default: go to task center
      buttons.push(
        <Button
          key="task-center"
          onClick={() => {
            navigate('/task-center');
            onOpenChange(false);
          }}
          className="flex-1"
        >
          Go to Task Center
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      );
    }
    
    return buttons;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      {/* POSITIONING FIX: Fixed the modal positioning by removing conflicting styles.
          The original classes were causing positioning conflicts with Dialog's built-in styling.
          Using fixed positioning with proper z-index ensures the modal stays centered. */}
      <DialogContent className="sm:max-w-[525px] dialog-content-above-confetti fixed z-50 top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] !m-0 !p-6">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="rounded-full bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              {titleText}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Form submission completion notification with next steps
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="py-5 space-y-6">
          <p className="text-center text-gray-500">
            Good job! You have successfully submitted the form for <span className="font-semibold text-gray-700">{companyName}</span>
          </p>
          
          <div className="space-y-3 text-sm">
            {getActionCards()}
          </div>
        </div>
        <div className="flex justify-between gap-4 mt-2">
          {getActionButtons()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UniversalSuccessModal;