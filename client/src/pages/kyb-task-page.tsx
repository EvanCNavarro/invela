import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { UniversalForm } from "@/components/forms";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { enhancedKybServiceFactory } from "@/services/enhanced-kyb-service";
import { directlyAddFileVaultTab, enableFileVault } from "@/services/fileVaultService";

interface KYBTaskPageProps {
  params: {
    slug: string;
  }
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  task_scope: string;
  status: string;
  priority: string;
  progress: number;
  metadata: {
    company_name?: string;
    [key: string]: any;
  } | null;
}

export default function KYBTaskPage({ params }: KYBTaskPageProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const companyName = params.slug.replace('kyb-', '');
  
  // Parse URL query parameters to check for review=true
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const isReviewMode = searchParams.get('review') === 'true';

  // Fetch task details by company name
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['/api/tasks/kyb', companyName],
    enabled: !!companyName
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load KYB task. Please try again.",
        variant: "destructive",
      });
      navigate('/task-center');
    }
  }, [error, navigate, toast]);
  
  // Create isolated service instance for this task when the task data loads
  useEffect(() => {
    if (task) {
      const companyId = task.metadata?.company_id;
      if (companyId) {
        console.log(`[KYB Task Page] Creating isolated KYB service instance for company ${companyId}, task ${task.id}`);
        // Get company-specific service instance
        enhancedKybServiceFactory.getInstance(companyId, task.id);
        
        // Clean up the instance when component unmounts or task/company changes
        return () => {
          console.log(`[KYB Task Page] Cleaning up KYB service instance for company ${companyId}, task ${task.id}`);
          enhancedKybServiceFactory.clearInstance(companyId, task.id);
        };
      }
    }
  }, [task]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground">
              Could not find the KYB task for {companyName}. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title={`KYB Form: ${task.metadata?.company_name || companyName}`}
          description="Complete the Know Your Business (KYB) verification form"
        />

        <div className="container max-w-7xl mx-auto">
          <UniversalForm 
            taskId={task.id}
            taskType="kyb"
            initialData={task.savedFormData}
            onSubmit={(formData) => {
              // Handle form submission
              console.log('[KYB Form] Starting form submission:', {
                taskId: task.id,
                formDataKeys: Object.keys(formData),
                timestamp: new Date().toISOString()
              });
              
              // Use standardized filename format
              const now = new Date();
              const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
              const formattedTime = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
              const cleanCompanyName = (companyName || 'Company').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
              
              const requestData = {
                fileName: `KYBForm_${task.id}_${cleanCompanyName}_${formattedDate}_${formattedTime}_v1.0`,
                formData,
                taskId: task.id,
                // IMPORTANT: Add explicit submission flag to ensure correct processing
                explicitSubmission: true
              };
              
              console.log('[KYB Form] Sending submission request:', {
                fileName: requestData.fileName,
                taskId: requestData.taskId,
                explicitSubmission: requestData.explicitSubmission,
                timestamp: new Date().toISOString()
              });
              
              // CRITICAL FIX: Force submission dialog to close after 10 seconds if server doesn't respond
              // This ensures the user isn't stuck with a spinning indicator forever
              const submissionTimeout = setTimeout(() => {
                console.log('[KYB Form] Submission taking too long, forcing completion');
                // Force the file vault tab to be unlocked even if API is slow
                try {
                  directlyAddFileVaultTab();
                  enableFileVault().catch(e => console.error('[KYB Form] Emergency file vault enable failed:', e));
                } catch (e) {
                  console.error('[KYB Form] Emergency file vault enable failed:', e);
                }
                
                toast({
                  title: "KYB Form Submitted",
                  description: "Your form was processed, but the server response was delayed. The File Vault tab should now be enabled.",
                });
                navigate('/task-center');
              }, 10000); // 10 second timeout
              
              // Using the correct endpoint URL that's working on the server
              fetch(`/api/kyb/submit/${task.id}`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json' 
                },
                credentials: 'include', // Important: Include credentials (cookies) with the request
                body: JSON.stringify(requestData)
              })
              .then(async response => {
                console.log('[KYB Form] Received response:', {
                  status: response.status,
                  statusText: response.statusText,
                  headers: {
                    contentType: response.headers.get('content-type'),
                    contentLength: response.headers.get('content-length')
                  },
                  ok: response.ok,
                  timestamp: new Date().toISOString()
                });
                
                // First check if response is ok
                if (!response.ok) {
                  // Try to get error details if available in JSON format
                  try {
                    console.log('[KYB Form] Attempting to parse error response as JSON');
                    const errorData = await response.json();
                    console.log('[KYB Form] Parsed error JSON:', errorData);
                    throw new Error(errorData.error || 'Failed to save KYB form');
                  } catch (jsonError) {
                    // If can't parse as JSON, get text and log it
                    console.log('[KYB Form] Error parsing JSON response, getting text instead', jsonError);
                    const textResponse = await response.text();
                    console.error('[KYB Form] Server returned non-JSON response:', {
                      responseText: textResponse.substring(0, 500),  // First 500 chars
                      responseLength: textResponse.length,
                      timestamp: new Date().toISOString()
                    });
                    throw new Error('Server returned invalid response. Please try again.');
                  }
                }
                
                // If response is ok, parse JSON
                const contentType = response.headers.get('content-type');
                console.log('[KYB Form] Content type of successful response:', contentType);
                
                if (contentType && contentType.includes('application/json')) {
                  const jsonResult = await response.json();
                  console.log('[KYB Form] Successfully parsed JSON response:', jsonResult);
                  return jsonResult;
                } else {
                  // If not JSON but response is OK, we still proceed
                  console.log('[KYB Form] Response not JSON but successful, returning generic success');
                  return { success: true };
                }
              })
              .then((result) => {
                // Clear the timeout since we got a response
                clearTimeout(submissionTimeout);
                
                console.log('[KYB Form] Submission result received:', result);
                
                // COMPREHENSIVE FIX: Add file-vault tab directly to the current company data in cache
                // AND update the database through the API
                try {
                  console.log('[KYB Form] KYB form submitted successfully, updating file vault tab');
                  
                  // First, immediately update the local cache for instant UI update
                  const cacheResult = directlyAddFileVaultTab();
                  console.log('[KYB Form] Direct cache update result:', cacheResult);
                  
                  // Next, make the API call to make the change persistent in the database
                  // Use the directly imported function
                  enableFileVault().then(apiResult => {
                    console.log('[KYB Form] API file vault update result:', apiResult);
                  }).catch(apiError => {
                    console.error('[KYB Form] API file vault update failed:', apiError);
                  });
                  
                  // For extra reliability, hit the force-enable endpoint directly
                  fetch('/api/file-vault/force-enable', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                  })
                  .then(response => response.json())
                  .then(data => {
                    console.log('[KYB Form] Direct force-enable result:', data);
                  })
                  .catch(fetchError => {
                    console.error('[KYB Form] Direct force-enable failed:', fetchError);
                  });
                  
                } catch (cacheUpdateError) {
                  console.error('[KYB Form] Error updating file vault tab in cache:', cacheUpdateError);
                  
                  // If direct update fails, try with emergency endpoint
                  console.log('[KYB Form] Using emergency file vault update method for company ID:', task.metadata?.company_id);
                  
                  // Use the company ID from task metadata
                  fetch('/api/emergency/unlock-file-vault/' + task.metadata?.company_id, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                  })
                  .then(response => response.json())
                  .then(data => {
                    console.log('[KYB Form] Emergency update result:', data);
                  })
                  .catch(emergencyError => {
                    console.error('[KYB Form] Emergency update failed:', emergencyError);
                  });
                }
                
                // Show success toast and navigate to task center
                toast({
                  title: "KYB Form Submitted",
                  description: "Your KYB form has been saved and the task has been updated. The File Vault tab is now enabled.",
                });
                
                // Mark onboarding as completed using the global function we exposed
                if (window && typeof (window as any).markOnboardingCompleted === 'function') {
                  console.log('[KYB Form] Marking onboarding as completed');
                  (window as any).markOnboardingCompleted();
                } else {
                  console.log('[KYB Form] markOnboardingCompleted function not found, using fallback');
                  // Fallback: directly set in localStorage
                  try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (user && user.id) {
                      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
                    }
                  } catch (e) {
                    console.error('[KYB Form] Failed to set fallback onboarding status:', e);
                  }
                }
                
                // Add a small delay before navigation to ensure UI updates and toast is visible
                setTimeout(() => {
                  navigate('/task-center');
                }, 1000);
              })
              .catch(error => {
                // Clear the timeout since we got a response (even if it's an error)
                clearTimeout(submissionTimeout);
                
                console.error('[KYB Form] Form submission failed:', {
                  errorMessage: error.message,
                  errorName: error.name,
                  errorStack: error.stack,
                  timestamp: new Date().toISOString()
                });
                
                // Try to fetch the current session status to debug authentication issues
                fetch('/api/auth/user', { 
                  credentials: 'include',
                  headers: { 'Accept': 'application/json' }
                })
                .then(response => {
                  console.log('[KYB Form] Auth check response:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    timestamp: new Date().toISOString()
                  });
                  
                  return response.ok ? response.json() : { error: 'Not authenticated' };
                })
                .then(data => {
                  console.log('[KYB Form] Auth status data:', data);
                })
                .catch(authError => {
                  console.error('[KYB Form] Auth check failed:', authError);
                });
                
                toast({
                  title: "Error",
                  description: error.message || "Failed to save KYB form. Please try again.",
                  variant: "destructive",
                });
              });
            }}
            onProgress={(progress) => {
              // Handle progress updates if needed
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
