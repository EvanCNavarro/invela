import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertTriangle, FileCheck, FileX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormDataField {
  field_key: string;
  value: string;
  status: string;
  version: number;
  updated_at: string;
}

interface DebugApiResponse {
  task: {
    id: number;
    title: string;
    status: string;
    progress: number;
    created_at: string;
    updated_at: string;
    metadata: Record<string, any>;
  },
  formDataFields: number;
  responseCount: number;
  asdfFields: string[];
  keysOfInterest: {
    corporateRegistration: string | null;
    goodStanding: string | null;
    regulatoryActions: string | null;
    investigationsIncidents: string | null;
  },
  formData: Record<string, string>;
  responses: FormDataField[];
}

interface TaskWithIssues {
  taskId: number;
  title: string;
  testFields: Array<{
    fieldKey: string;
    value: string;
  }>;
}

interface TasksWithIssuesResponse {
  tasksWithIssues: TaskWithIssues[];
}

/**
 * A debugging page for form data persistence issues 
 */
export default function FormDebugPage() {
  const [taskId, setTaskId] = useState<string>('');
  const [inspectedTaskId, setInspectedTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  // Query for tasks with issues
  const tasksWithIssuesQuery = useQuery<TasksWithIssuesResponse>({
    queryKey: ['/api/debug/tasks-with-issues'],
    enabled: true, // Always run this query
  });

  // Query for specific task data
  const taskDebugQuery = useQuery<DebugApiResponse>({
    queryKey: ['/api/debug/form', inspectedTaskId],
    enabled: !!inspectedTaskId, // Only run when inspectedTaskId is set
  });

  // Handle task inspection
  const handleInspectTask = () => {
    if (!taskId) {
      toast({
        title: 'Task ID required',
        description: 'Please enter a task ID to inspect',
        variant: 'destructive',
      });
      return;
    }

    setInspectedTaskId(taskId);
  };

  // Handle clicking on a task from the issues list
  const handleSelectTask = (id: number) => {
    setTaskId(id.toString());
    setInspectedTaskId(id.toString());
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Form Debug Dashboard</h1>
      <p className="text-gray-600">
        This page helps diagnose form data persistence issues by showing detailed information about form field values.
      </p>

      {/* Task selector */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Inspect Task Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="taskId">Task ID</Label>
              <Input
                id="taskId"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Enter task ID to inspect"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleInspectTask}
                disabled={!taskId || taskDebugQuery.isPending}
              >
                {taskDebugQuery.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Inspect Task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks with issues */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Tasks with Test Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksWithIssuesQuery.isPending ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : tasksWithIssuesQuery.isError ? (
            <div className="py-8 text-center text-red-500">
              Error loading tasks with issues: {tasksWithIssuesQuery.error.message}
            </div>
          ) : (
            <div className="space-y-4">
              {tasksWithIssuesQuery.data?.tasksWithIssues?.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No tasks with test data found
                </div>
              ) : (
                <div className="divide-y">
                  {tasksWithIssuesQuery.data?.tasksWithIssues?.map((task) => (
                    <div key={task.taskId} className="py-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Task #{task.taskId}: {task.title}</h3>
                        <Button variant="outline" size="sm" onClick={() => handleSelectTask(task.taskId)}>
                          Inspect
                        </Button>
                      </div>
                      <div className="text-sm text-gray-600">
                        Fields with test data: {task.testFields.map(f => f.fieldKey).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task inspection results */}
      {taskDebugQuery.isPending ? (
        <Card>
          <CardContent className="py-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : taskDebugQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Error inspecting task: {taskDebugQuery.error.message}</p>
          </CardContent>
        </Card>
      ) : taskDebugQuery.data && (
        <>
          {/* Task overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Task #{taskDebugQuery.data.task.id}: {taskDebugQuery.data.task.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Task Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Status:</span>
                      <span>{taskDebugQuery.data.task.status}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Progress:</span>
                      <span>{taskDebugQuery.data.task.progress}%</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(taskDebugQuery.data.task.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Updated:</span>
                      <span>{new Date(taskDebugQuery.data.task.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Form Data Overview</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Form fields:</span>
                      <span>{taskDebugQuery.data.formDataFields}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Form responses:</span>
                      <span>{taskDebugQuery.data.responseCount}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Fields with test values:</span>
                      <span className={taskDebugQuery.data.asdfFields.length > 0 ? "text-amber-600 font-medium" : "text-green-600"}>
                        {taskDebugQuery.data.asdfFields.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fields of interest */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Fields of Interest</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCard 
                    label="Corporate Registration" 
                    value={taskDebugQuery.data.keysOfInterest.corporateRegistration} 
                    isTest={taskDebugQuery.data.keysOfInterest.corporateRegistration?.toLowerCase() === 'asdf'}
                  />
                  <FieldCard 
                    label="Good Standing" 
                    value={taskDebugQuery.data.keysOfInterest.goodStanding} 
                    isTest={taskDebugQuery.data.keysOfInterest.goodStanding?.toLowerCase() === 'asdf'}
                  />
                  <FieldCard 
                    label="Regulatory Actions" 
                    value={taskDebugQuery.data.keysOfInterest.regulatoryActions} 
                    isTest={taskDebugQuery.data.keysOfInterest.regulatoryActions?.toLowerCase() === 'asdf'}
                  />
                  <FieldCard 
                    label="Investigations & Incidents" 
                    value={taskDebugQuery.data.keysOfInterest.investigationsIncidents} 
                    isTest={taskDebugQuery.data.keysOfInterest.investigationsIncidents?.toLowerCase() === 'asdf'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All form fields */}
          <Card>
            <CardHeader>
              <CardTitle>All Form Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 border">Field Key</th>
                      <th className="text-left p-2 border">Value</th>
                      <th className="text-left p-2 border">Status</th>
                      <th className="text-left p-2 border">Version</th>
                      <th className="text-left p-2 border">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskDebugQuery.data.responses.map((field, index) => (
                      <tr key={index} className={field.value?.toLowerCase() === 'asdf' ? 'bg-amber-50' : 'even:bg-gray-50'}>
                        <td className="p-2 border">{field.field_key}</td>
                        <td className="p-2 border">
                          <div className="flex items-center">
                            {field.value || <span className="text-gray-400 italic">Empty</span>}
                            {field.value?.toLowerCase() === 'asdf' && (
                              <span className="ml-2 text-amber-600 text-xs font-medium">TEST VALUE</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border">{field.status}</td>
                        <td className="p-2 border">{field.version}</td>
                        <td className="p-2 border">{new Date(field.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function FieldCard({ label, value, isTest }: { label: string; value: string | null; isTest: boolean }) {
  return (
    <div className={`p-4 rounded-lg border ${isTest ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{label}</h4>
        {isTest ? (
          <FileX className="h-5 w-5 text-amber-600" />
        ) : value ? (
          <FileCheck className="h-5 w-5 text-green-600" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-gray-400" />
        )}
      </div>
      <div className="text-sm">
        {value ? (
          <div className="break-words">
            {value}
            {isTest && <span className="ml-2 text-amber-600 text-xs font-medium">TEST VALUE</span>}
          </div>
        ) : (
          <span className="text-gray-400 italic">No value set</span>
        )}
      </div>
    </div>
  );
}