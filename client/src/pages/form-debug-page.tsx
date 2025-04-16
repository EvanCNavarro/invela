import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

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

/**
 * A debugging page for form data persistence issues 
 */
export default function FormDebugPage() {
  const [taskId, setTaskId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<DebugApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const parsedTaskId = parseInt(taskId);
      if (isNaN(parsedTaskId)) {
        throw new Error('Invalid task ID');
      }
      
      // Fetch from our debug endpoint
      const response = await fetch(`/api/debug/form/${parsedTaskId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error fetching debug info: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      setResults(data);
      
      // Check for "asdf" test values
      if (data.asdfFields && data.asdfFields.length > 0) {
        console.warn(`Found ${data.asdfFields.length} fields with "asdf" values in task ${parsedTaskId}:`);
        console.warn(data.asdfFields);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Error fetching debug info:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Form Data Debug Tool</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Debug Form Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1">
              <label className="block mb-2">Task ID</label>
              <Input
                type="number"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Enter task ID to debug"
              />
            </div>
            <Button 
              onClick={fetchDebugInfo}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Fetch Debug Info'}
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {results && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">ID</div>
                  <div className="font-medium">{results.task.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">{results.task.status}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                  <div className="font-medium">{results.task.progress}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">{new Date(results.task.updated_at).toLocaleString()}</div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Title</div>
                <div className="font-medium mb-4">{results.task.title}</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Form Fields</div>
                  <div className="font-medium">{results.formDataFields}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Response Count</div>
                  <div className="font-medium">{results.responseCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {results.asdfFields.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Test Data Detected</AlertTitle>
              <AlertDescription>
                Found {results.asdfFields.length} fields with "asdf" test values: {results.asdfFields.join(', ')}
              </AlertDescription>
            </Alert>
          )}
          
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Key Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">corporateRegistration</div>
                  <div className="font-medium">{results.keysOfInterest.corporateRegistration || '(not set)'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">goodStanding</div>
                  <div className="font-medium">{results.keysOfInterest.goodStanding || '(not set)'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">regulatoryActions</div>
                  <div className="font-medium">{results.keysOfInterest.regulatoryActions || '(not set)'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">investigationsIncidents</div>
                  <div className="font-medium">{results.keysOfInterest.investigationsIncidents || '(not set)'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Form Field Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Field Key</th>
                      <th className="text-left p-2">Value</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Version</th>
                      <th className="text-left p-2">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.responses.map((field, index) => (
                      <tr key={index} className={`${index % 2 === 0 ? 'bg-muted/50' : ''} ${field.value === 'asdf' ? 'bg-red-100' : ''}`}>
                        <td className="p-2">{field.field_key}</td>
                        <td className="p-2">{field.value || '(empty)'}</td>
                        <td className="p-2">{field.status}</td>
                        <td className="p-2">{field.version}</td>
                        <td className="p-2">{new Date(field.updated_at).toLocaleString()}</td>
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