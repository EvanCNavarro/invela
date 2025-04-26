/**
 * Test Component for Standardized KY3P Update
 * 
 * This component tests the standardized KY3P update approach using string-based field keys.
 * It demonstrates both:
 * 1. The problem with the "Invalid field ID format" error when using fieldIdRaw: "bulk"
 * 2. The solution using our standardized approach with string field keys
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { standardizedBulkUpdate } from '../forms/standardized-ky3p-update';
import { KY3PFormServiceFixed } from '@/services/ky3p-form-service-fixed';
import { Loader2 } from 'lucide-react';

export default function TestStandardizedKy3pUpdate() {
  const [taskId, setTaskId] = useState<string>('654');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('demo');
  
  const { toast } = useToast();

  // Test the problematic pattern that causes "Invalid field ID format" errors
  const testProblemCase = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // This is the exact request pattern that causes the error
      const response = await fetch(`/api/ky3p/responses/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIdRaw: taskId,
          fieldIdRaw: 'bulk',
          responseValue: 'undefined',
          responseValueType: 'undefined'
        }),
      });
      
      const data = await response.text();
      
      if (response.ok) {
        setResult(`✅ Success: ${data}`);
        toast({
          title: 'Success',
          description: 'The request was successful',
        });
      } else {
        setResult(`❌ Error: ${data}`);
        toast({
          title: 'Error',
          description: `Status ${response.status}: ${data}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      setResult(`❌ Exception: ${error.message}`);
      toast({
        title: 'Exception',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Test our standardized solution
  const testStandardizedUpdate = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // Using our standardized bulk update approach
      const success = await standardizedBulkUpdate(parseInt(taskId), {
        // Sample form data
        'company_name': 'Acme Corp',
        'contact_name': 'John Doe',
        'contact_email': 'john@example.com'
      });
      
      if (success) {
        setResult('✅ Successfully updated using standardized approach');
        toast({
          title: 'Success',
          description: 'The standardized update was successful',
        });
      } else {
        setResult('❌ Failed to update using standardized approach');
        toast({
          title: 'Error',
          description: 'The standardized update failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setResult(`❌ Exception: ${error.message}`);
      toast({
        title: 'Exception',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Test the demo auto-fill
  const testDemoAutoFill = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // Use our fixed KY3P form service to get demo data and apply it
      const formService = new KY3PFormServiceFixed(parseInt(taskId));
      
      // Get demo data
      const demoData = await formService.getDemoData(parseInt(taskId));
      
      if (!demoData || Object.keys(demoData).length === 0) {
        setResult('❌ No demo data available');
        toast({
          title: 'Error',
          description: 'No demo data was found for this task',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Use our form service to save the demo data
      const success = await formService.bulkUpdate(demoData);
      
      if (success) {
        setResult(`✅ Successfully applied demo data (${Object.keys(demoData).length} fields)`);
        toast({
          title: 'Success',
          description: `Demo data successfully applied to ${Object.keys(demoData).length} fields`,
        });
      } else {
        setResult('❌ Failed to apply demo data');
        toast({
          title: 'Error',
          description: 'The demo auto-fill failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setResult(`❌ Exception: ${error.message}`);
      toast({
        title: 'Exception',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Standardized KY3P Update Tester</CardTitle>
          <CardDescription>
            Test the standardized approach for KY3P form updates using string-based field keys.
            This resolves the "Invalid field ID format" error that occurs with bulk updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="block text-sm mb-2">Task ID</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Enter KY3P task ID"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Default is 654, a known KY3P task with test data
            </p>
          </div>
          
          <Separator className="my-4" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="problem">Problem Case</TabsTrigger>
              <TabsTrigger value="solution">Solution</TabsTrigger>
              <TabsTrigger value="demo">Demo Auto-Fill</TabsTrigger>
            </TabsList>
            
            <TabsContent value="problem">
              <Alert className="mb-4 bg-amber-50">
                <AlertTitle>Problem Case</AlertTitle>
                <AlertDescription>
                  This replicates the exact request pattern that causes the "Invalid field ID format" error.
                  It sends <code className="px-1 bg-gray-100 rounded">fieldIdRaw: "bulk"</code> to the server.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={testProblemCase} 
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing problem case...
                  </>
                ) : (
                  'Test Problem Case'
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="solution">
              <Alert className="mb-4 bg-green-50">
                <AlertTitle>Solution</AlertTitle>
                <AlertDescription>
                  This uses our standardized bulk update approach with string-based field keys.
                  It correctly formats the request to avoid the "Invalid field ID format" error.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={testStandardizedUpdate} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing standardized update...
                  </>
                ) : (
                  'Test Standardized Update'
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="demo">
              <Alert className="mb-4 bg-blue-50">
                <AlertTitle>Demo Auto-Fill</AlertTitle>
                <AlertDescription>
                  This uses our fixed KY3P form service with the standardized update approach
                  to get and apply demo data to a KY3P task. This is what the "Auto-Fill" button
                  in the UI would use.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={testDemoAutoFill} 
                disabled={loading}
                className="w-full"
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running demo auto-fill...
                  </>
                ) : (
                  'Test Demo Auto-Fill'
                )}
              </Button>
            </TabsContent>
          </Tabs>
          
          {result && (
            <div className="mt-6 p-4 border rounded bg-gray-50">
              <h3 className="font-semibold mb-2">Result</h3>
              <div className="whitespace-pre-wrap font-mono text-sm">
                {result}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            <Badge variant="outline" className="mr-2">KY3P</Badge>
            <Badge variant="outline">Standardized Updates</Badge>
          </div>
          <Button variant="ghost" onClick={() => window.location.href = '/'}>Back to Dashboard</Button>
        </CardFooter>
      </Card>
    </div>
  );
}