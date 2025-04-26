import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { standardizedBulkUpdate } from '@/components/forms/standardized-ky3p-update';
import { KY3PDemoAutoFill } from '@/components/forms/KY3PDemoAutoFill';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

/**
 * Test component for the standardized KY3P update functionality
 * 
 * This component provides a UI for testing both the batch update endpoint
 * and the demo auto-fill endpoint for KY3P forms.
 */
export function TestStandardizedKy3pUpdate() {
  const [taskId, setTaskId] = useState<number>(654); // Default to task ID 654
  const [formData, setFormData] = useState<Record<string, string>>({
    'company_name': 'DevTest35',
    'contact_email': 'support@devtest35.com',
    'contact_phone': '+1-555-123-4567',
    'security_policy_documented': 'Yes'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleTaskIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setTaskId(isNaN(value) ? 0 : value);
  };
  
  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleAddField = () => {
    const newKey = `field_${Object.keys(formData).length + 1}`;
    setFormData(prev => ({
      ...prev,
      [newKey]: ''
    }));
  };
  
  const handleBatchUpdate = async () => {
    setIsLoading(true);
    
    try {
      const result = await standardizedBulkUpdate(taskId, formData);
      
      if (result) {
        toast({
          title: 'Batch Update Successful',
          description: `Updated ${Object.keys(formData).length} fields`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Batch Update Failed',
          description: 'The update operation did not complete successfully',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error during batch update:', error);
      
      toast({
        title: 'Batch Update Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDemoSuccess = () => {
    toast({
      title: 'Demo Data Updated',
      description: 'The form has been successfully populated with demo data',
      variant: 'default'
    });
  };
  
  return (
    <div className="container mx-auto py-10">
      <Tabs defaultValue="batch-update">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="batch-update">Batch Update</TabsTrigger>
          <TabsTrigger value="demo-autofill">Demo Auto-Fill</TabsTrigger>
        </TabsList>
        
        <TabsContent value="batch-update">
          <Card>
            <CardHeader>
              <CardTitle>KY3P Batch Update</CardTitle>
              <CardDescription>
                Test the standardized batch update endpoint for KY3P forms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskId">Task ID</Label>
                <Input 
                  id="taskId" 
                  type="number" 
                  value={taskId.toString()} 
                  onChange={handleTaskIdChange}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Form Fields</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddField}
                  >
                    Add Field
                  </Button>
                </div>
                
                {Object.entries(formData).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <Input 
                        value={key} 
                        disabled 
                        placeholder="Field Key"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        value={value} 
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        placeholder="Field Value"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleBatchUpdate} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Send Batch Update'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="demo-autofill">
          <Card>
            <CardHeader>
              <CardTitle>KY3P Demo Auto-Fill</CardTitle>
              <CardDescription>
                Test the demo auto-fill functionality for KY3P forms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demoTaskId">Task ID</Label>
                <Input 
                  id="demoTaskId" 
                  type="number" 
                  value={taskId.toString()} 
                  onChange={handleTaskIdChange}
                />
              </div>
              
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  This will populate the KY3P form with demo data using the standardized approach.
                  The demo data includes company information, security controls, business continuity,
                  and third-party management details.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <KY3PDemoAutoFill 
                taskId={taskId} 
                onSuccess={handleDemoSuccess}
              />
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TestStandardizedKy3pUpdate;