import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { 
  CheckCircle, 
  FileText, 
  ArrowRight, 
  Shield, 
  Check, 
  Archive, 
  LayoutDashboard, 
  PieChart, 
  FileArchive, 
  Folder,
  Download,
  FolderOpen
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { userContext } from "@/lib/user-context";
import getLogger from "@/utils/logger";

export interface SubmissionResult {
  fileId?: number;
  fileName?: string; // Added explicit fileName for generated files
  downloadUrl?: string;
  taskId?: number;
  taskStatus?: string;
  nextTaskId?: number;
  riskScore?: number;
  unlockedTabs?: string[]; // Added to track which tabs were unlocked
  completedActions?: SubmissionAction[];
  // For KYB responses which may contain nested data property
  data?: {
    fileId?: number;
    fileName?: string;
    downloadUrl?: string;
    unlockedTabs?: string[];
    [key: string]: any; // Other data properties
  };
  // Add other task-specific fields here
}

export interface SubmissionAction {
  type: string;       // Type of action: "task_completion", "file_generation", etc.
  description: string; // Human-readable description
  icon?: string;      // Icon name for this action
  data?: {
    details?: string;   // Human-readable details about this action
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
      
      // CRITICAL FIX: Store the form submission info in localStorage for the Sidebar to use
      // This helps maintain tab state during WebSocket disruptions or page reloads
      try {
        const { taskId, unlockedTabs, fileId } = submissionResult;
        // Get companyId from multiple possible sources
        let companyId = submissionResult.data?.companyId;
        
        // CRITICAL FIX: If companyId is missing, get it from the user context
        if (!companyId) {
          // Try to get from our userContext utility which is the most reliable source
          const contextCompanyId = userContext.getCompanyId();
          if (contextCompanyId) {
            companyId = contextCompanyId;
            getLogger('UniversalSuccessModal').info(`Retrieved companyId ${companyId} from userContext`);
          }
          
          // If still not found, try fallbacks
          if (!companyId) {
            // Try to get from localStorage user_data
            const userDataStr = localStorage.getItem('user_data');
            if (userDataStr) {
              try {
                const userData = JSON.parse(userDataStr);
                companyId = userData.company_id;
                getLogger('UniversalSuccessModal').info(`Retrieved companyId ${companyId} from user_data`);
              } catch (err) {
                getLogger('UniversalSuccessModal').error('Failed to parse user_data:', err);
              }
            }
            
            // If still not found, try the URL
            if (!companyId) {
              const urlParams = new URLSearchParams(window.location.search);
              const companyIdFromUrl = urlParams.get('companyId');
              if (companyIdFromUrl) {
                companyId = parseInt(companyIdFromUrl);
                getLogger('UniversalSuccessModal').info(`Retrieved companyId ${companyId} from URL`);
              }
            }
          }
          
          if (!companyId) {
            getLogger('UniversalSuccessModal').warn('⚠️ Could not determine companyId for form submission!');
          }
        }
        
        if (taskType) {
          // Store minimal info to avoid bloating localStorage
          const submissionInfo = {
            taskId,
            taskType,
            formType: taskType, // Use taskType for formType for consistency
            companyId,
            fileId,
            timestamp: new Date().toISOString(),
            unlockedTabs: unlockedTabs || submissionResult.data?.unlockedTabs || []
          };
          
          // Store in localStorage to help with connection issues
          localStorage.setItem('lastFormSubmission', JSON.stringify(submissionInfo));
          getLogger('UniversalSuccessModal').info(`Stored form submission info in localStorage:`, submissionInfo);
        }
      } catch (error) {
        getLogger('UniversalSuccessModal').error('Error storing form submission in localStorage:', error);
      }

      // Clean up timeout if modal is closed
      return () => clearTimeout(animationTimeout);
    }
  }, [open, submissionResult, taskType]); // Include necessary dependencies
  
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
    const cards: React.ReactNode[] = [];
    
    // Always check completedActions first
    if (submissionResult.completedActions && submissionResult.completedActions.length > 0) {
      // Look for specific action types in completedActions
      const formSubmittedAction = submissionResult.completedActions.find(a => a.type === 'form_submitted');
      const fileGeneratedAction = submissionResult.completedActions.find(a => a.type === 'file_generated');
      const tabsUnlockedAction = submissionResult.completedActions.find(a => a.type === 'tabs_unlocked');
      
      // Default task completion card
      if (formSubmittedAction) {
        cards.push(
          <div key="task-completed" className="flex items-start gap-3 border rounded-md p-3 bg-green-50 border-green-200">
            <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Task Completed</p>
              <p className="text-gray-600">{formSubmittedAction.description || "Your form has been successfully submitted and marked as complete."}</p>
            </div>
          </div>
        );
      } else {
        // Fallback if no form_submitted action found
        cards.push(
          <div key="task-completed" className="flex items-start gap-3 border rounded-md p-3 bg-green-50 border-green-200">
            <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Task Completed</p>
              <p className="text-gray-600">Your form has been successfully submitted and marked as complete.</p>
            </div>
          </div>
        );
      }
      
      // File generation card with improved visibility and File Vault link
      if (fileGeneratedAction) {
        cards.push(
          <div key="file-generated" className="flex items-start gap-3 border rounded-md p-3 bg-blue-50 border-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-12 w-12 -mt-4 -mr-4 bg-blue-100 rounded-full opacity-50"></div>
            <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0 z-10" />
            <div className="z-10 w-full">
              <div className="flex justify-between items-start">
                <p className="font-medium text-gray-900">Report Generated</p>
                <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  {submissionResult.fileId ? `File #${submissionResult.fileId}` : 'New File'}
                </Badge>
              </div>
              <p className="text-gray-600 mb-2">{fileGeneratedAction.description}</p>
              
              {/* CRITICAL FIX: Clear instructions for accessing files in File Vault */}
              <p className="text-sm text-gray-500 mb-1">
                Your file has been saved to the File Vault and is available for download.
              </p>
              
              <div className="flex gap-2 mt-2">
                {/* Direct download if URL is available */}
                {submissionResult.downloadUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(submissionResult.downloadUrl, '_blank')}
                    className="text-xs h-8"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download File
                  </Button>
                )}
                
                {/* Link to File Vault */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="text-xs h-8 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                >
                  <Link href="/file-vault">
                    <FolderOpen className="h-3.5 w-3.5 mr-1" />
                    View in File Vault
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        );
      }
      
      // Tabs unlocked card
      if (tabsUnlockedAction) {
        cards.push(
          <div key="tabs-unlocked" className="flex items-start gap-3 border rounded-md p-3 bg-blue-50 border-blue-200">
            <LayoutDashboard className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">New Access Granted</p>
              <p className="text-gray-600">{tabsUnlockedAction.description}</p>
            </div>
          </div>
        );
      }
      
      // Add any other action cards
      submissionResult.completedActions.forEach((action, index) => {
        // Skip actions that we've already handled
        if (action.type === 'form_submitted' || action.type === 'file_generated' || action.type === 'tabs_unlocked') return;
        
        // Select icon based on action type
        let ActionIcon = FileText;
        let bgClass = "bg-white";
        let borderClass = "border-gray-200";
        let iconColor = "text-gray-600";
        
        // Customize appearance based on action type
        switch(action.type) {
          case "next_task":
            ActionIcon = ArrowRight;
            bgClass = "bg-indigo-50";
            borderClass = "border-indigo-200";
            iconColor = "text-indigo-600";
            break;
          case "risk_assessment":
            ActionIcon = Shield;
            bgClass = "bg-white";
            borderClass = "border-gray-200";
            iconColor = "text-gray-600";
            break;
          case "file_vault_unlocked":
            ActionIcon = Archive;
            bgClass = "bg-blue-50";
            borderClass = "border-blue-200";
            iconColor = "text-blue-600";
            break;
        }
        
        cards.push(
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
    
    // Fallback to the old implementation if completedActions is not available
    } else {
      // Start with basic task completion card if not already added
      if (!cards.some(card => React.isValidElement(card) && card.key === "task-completed")) {
        cards.push(
          <div key="task-completed" className="flex items-start gap-3 border rounded-md p-3 bg-green-50 border-green-200">
            <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Task Completed</p>
              <p className="text-gray-600">Your form has been successfully submitted and marked as complete.</p>
            </div>
          </div>
        );
      }
      
      // Add file generation card if a file was generated
      const fileId = submissionResult.fileId || 
                   (submissionResult.data && 'fileId' in submissionResult.data ? submissionResult.data.fileId : undefined);
      const fileName = submissionResult.fileName || 
                     (submissionResult.data && 'fileName' in submissionResult.data ? submissionResult.data.fileName : undefined);
      
      if (fileId && !cards.some(card => React.isValidElement(card) && card.key === "file-generated")) {
        cards.push(
          <div key="file-generated" className="flex items-start gap-3 border rounded-md p-3 bg-white border-gray-200">
            <FileText className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Report Generated</p>
              <p className="text-gray-600">
                {fileName 
                  ? `The file "${fileName}" has been created and saved to your file vault.` 
                  : `A report has been generated and saved to your file vault.`}
              </p>
            </div>
          </div>
        );
      }
      
      // Add tab unlocking card if tabs were unlocked
      const unlockedTabs = submissionResult.unlockedTabs || 
                         (submissionResult.data && 'unlockedTabs' in submissionResult.data ? submissionResult.data.unlockedTabs : undefined);
      
      // CRITICAL FIX: For KYB forms, explicitly filter out 'dashboard' tab which should not be shown
      // This ensures KYB forms only show File Vault, not Dashboard in the success modal
      let filteredUnlockedTabs = unlockedTabs;
      if (taskType === 'kyb' || taskType === 'company_kyb') {
        getLogger('UniversalSuccessModal').info('KYB form - filtering out dashboard tab from display');
        filteredUnlockedTabs = unlockedTabs?.filter(tab => tab !== 'dashboard');
      }
      
      if (filteredUnlockedTabs && filteredUnlockedTabs.length > 0 && !cards.some(card => React.isValidElement(card) && card.key === "tabs-unlocked")) {
        // Function to get tab display info
        const getTabDisplayInfo = (tabName: string): { name: string; icon: typeof LayoutDashboard } => {
          switch(tabName) {
            case 'dashboard':
              return { name: 'Dashboard', icon: LayoutDashboard };
            case 'insights':
              return { name: 'Insights', icon: PieChart };
            case 'file-vault':
              return { name: 'File Vault', icon: Folder };
            case 'documents':
              return { name: 'Documents', icon: FileArchive };
            default:
              // Default case for unknown tabs
              return { name: tabName.replace(/-/g, ' '), icon: Shield };
          }
        };
        
        // Format the list of unlocked tabs
        const tabDescriptions = filteredUnlockedTabs.map(tab => {
          const tabInfo = getTabDisplayInfo(tab);
          return tabInfo.name;
        }).join(', ');
        
        // Only show the card if there are tabs to display after filtering
        if (tabDescriptions) {
          cards.push(
            <div key="tabs-unlocked" className="flex items-start gap-3 border rounded-md p-3 bg-blue-50 border-blue-200">
              <Archive className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">New Access Granted</p>
                <p className="text-gray-600">
                  You now have access to: <span className="font-medium text-blue-700">{tabDescriptions}</span>
                </p>
              </div>
            </div>
          );
        }
      }
    }
    
    // Add any additional cards from completedActions
    if (submissionResult.completedActions && submissionResult.completedActions.length > 0) {
      submissionResult.completedActions.forEach((action, index) => {
        // Skip actions that we've already covered with our custom cards
        if (action.type === 'form_submitted') return;
        if (action.type === 'file_generated') return;
        if (action.type === 'tabs_unlocked') return;
        if (action.type === 'task_completion') return; // Already have a default task completion card
        
        // Select icon based on action type
        let ActionIcon = FileText;
        let bgClass = "bg-white";
        let borderClass = "border-gray-200";
        let iconColor = "text-gray-600";
        
        // Customize appearance based on action type
        switch(action.type) {
          case "next_task":
            ActionIcon = ArrowRight;
            bgClass = "bg-indigo-50";
            borderClass = "border-indigo-200";
            iconColor = "text-indigo-600";
            break;
          case "risk_assessment":
            ActionIcon = Shield;
            bgClass = "bg-white";
            borderClass = "border-gray-200";
            iconColor = "text-gray-600";
            break;
          case "file_vault_unlocked":
            ActionIcon = Archive;
            bgClass = "bg-blue-50";
            borderClass = "border-blue-200";
            iconColor = "text-blue-600";
            break;
        }
        
        cards.push(
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
    }
    
    return cards;
  };
  
  // Determine the best action buttons based on completed actions
  const getActionButtons = () => {
    const buttons: React.ReactNode[] = [];
    
    // Get unlocked tabs
    const unlockedTabs = submissionResult.unlockedTabs || 
                        (submissionResult.data && 'unlockedTabs' in submissionResult.data ? submissionResult.data.unlockedTabs : undefined);
    
    // File download button (if a file was generated)
    const fileId = submissionResult.fileId || 
                  (submissionResult.data && 'fileId' in submissionResult.data ? submissionResult.data.fileId : undefined);
    
    // Prioritize specific navigation based on task type and unlocked tabs
    if (unlockedTabs && unlockedTabs.length > 0) {
      // Function to get tab route info
      const getTabRouteInfo = (tabName: string): { path: string; displayName: string; icon: typeof LayoutDashboard } => {
        switch(tabName) {
          case 'dashboard':
            return { path: '/dashboard', displayName: 'View Dashboard', icon: LayoutDashboard };
          case 'insights':
            return { path: '/insights', displayName: 'View Insights', icon: PieChart };
          case 'file-vault':
            return { path: '/file-vault', displayName: 'View File Vault', icon: Folder };
          case 'documents':
            return { path: '/documents', displayName: 'View Documents', icon: FileArchive };
          default:
            // Default case for unknown tabs
            return { path: `/${tabName}`, displayName: `View ${tabName.replace(/-/g, ' ')}`, icon: Folder };
        }
      };
      
      // Determine which tab to prioritize for navigation
      // CRITICAL FIX: For KYB, we should prioritize file-vault, not dashboard
      // For other forms, prioritize in this order: dashboard, insights, file-vault
      let primaryTab = null;
      
      if (taskType === 'kyb' || taskType === 'company_kyb') {
        if (unlockedTabs.includes('file-vault')) {
          primaryTab = 'file-vault';
        } else if (unlockedTabs.length > 0) {
          // Use the first tab for KYB forms if file-vault isn't available
          primaryTab = unlockedTabs[0];
        }
      } else {
        // Standard priority for non-KYB forms
        if (unlockedTabs.includes('dashboard')) {
          primaryTab = 'dashboard';
        } else if (unlockedTabs.includes('insights')) {
          primaryTab = 'insights';
        } else if (unlockedTabs.includes('file-vault')) {
          primaryTab = 'file-vault';
        } else if (unlockedTabs.length > 0) {
          // Just use the first unlocked tab
          primaryTab = unlockedTabs[0];
        }
      }
      
      if (primaryTab) {
        const tabInfo = getTabRouteInfo(primaryTab);
        const TabIcon = tabInfo.icon;
        
        buttons.push(
          <Button
            key={`view-${primaryTab}`}
            onClick={() => {
              navigate(tabInfo.path);
              onOpenChange(false);
            }}
            className="flex-1"
          >
            {tabInfo.displayName}
            <TabIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      }
    }
    
    // If we have a generated file, offer download
    if (fileId) {
      const fileName = submissionResult.fileName || 
                      (submissionResult.data && 'fileName' in submissionResult.data ? submissionResult.data.fileName : undefined);
                      
      buttons.push(
        <Button
          key="download-file"
          variant={buttons.length > 0 ? "outline" : "default"}
          onClick={() => {
            // CRITICAL FIX: Navigate to file-vault instead of directly downloading (which can fail)
            // This ensures users still have access to the file in the File Vault
            // Use controlled navigation to prevent potential refresh issues
            getLogger('UniversalSuccessModal').info('Navigating to file-vault using controlled pattern');
            
            // Set localStorage flag to enable file-vault access
            try {
              localStorage.setItem('navigated_to_file_vault', 'true');
              localStorage.setItem('file_vault_access_timestamp', new Date().toISOString());
            } catch (error) {
              getLogger('UniversalSuccessModal').error('Failed to update localStorage:', error);
            }
            
            // Close modal first (better UX) then navigate
            onOpenChange(false);
            
            // Use controlled navigation with wouter - same pattern as SidebarTab.tsx
            window.history.pushState({}, '', '/file-vault');
            window.dispatchEvent(new PopStateEvent('popstate'));
            
            // Show a toast message to let the user know about the file
            // Note: Importing and using toast directly inside onClick handler
            import('@/hooks/use-toast').then(({ toast }) => {
              toast({
                title: "File Available in File Vault",
                description: `The file ${fileName || 'generated report'} is available in your File Vault`,
                duration: 5000
              });
            });
          }}
          className="flex-1"
        >
          {fileName ? `View in File Vault` : "View in File Vault"}
        </Button>
      );
    }
    
    // Next task button (if a next task is available)
    const nextTaskAction = submissionResult.completedActions?.find(a => a.type === "next_task");
    if (nextTaskAction) {
      buttons.push(
        <Button
          key="next-task"
          variant={buttons.length > 0 ? "outline" : "default"}
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
    }
    
    // If no specific buttons were added, add default "Go to Task Center" button
    if (buttons.length === 0) {
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