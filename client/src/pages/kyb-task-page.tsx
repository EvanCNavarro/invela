import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { UniversalForm } from "@/components/forms/UniversalForm";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { enhancedKybServiceFactory } from "@/services/enhanced-kyb-service";
import { enableFileVault } from "@/services/fileVaultService";

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
                taskId: task.id
              };
              
              console.log('[KYB Form] Sending request data:', {
                fileName: requestData.fileName,
                taskId: requestData.taskId,
                timestamp: new Date().toISOString()
              });
              
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
              .then(() => {
                // SIMPLIFIED APPROACH: Using our pre-emptive UI update + server-side integration
                try {
                  console.log('[KYB Form] KYB form submitted successfully, ensuring file vault is unlocked');
                  
                  // Since we already pre-emptively unlocked the File Vault in UniversalForm,
                  // we just need to make sure the server-side update happened
                  
                  // Make the API call to ensure the change is persistent in the database
                  // But with less aggressive retry logic
                  if (task.metadata?.company_id) {
                    const companyId = task.metadata.company_id;
                    enableFileVault(companyId).then(apiResult => {
                      console.log('[KYB Form] API file vault update result:', apiResult);
                    }).catch(apiError => {
                      console.warn('[KYB Form] API file vault update warning:', apiError);
                      // Non-blocking - UI is already updated
                    });
                  }
                  
                } catch (error) {
                  console.warn('[KYB Form] File vault verification warning:', error);
                  // Non-blocking - UI is already updated
                }
                
                toast({
                  title: "KYB Form Submitted",
                  description: "Your KYB form has been saved and the task has been updated. The File Vault tab is now enabled.",
                });
                navigate('/task-center');
              })
              .catch(error => {
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
