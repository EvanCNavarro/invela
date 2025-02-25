import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryKeys } from '@/lib/queryClient';
import useApiError from '@/hooks/useApiError';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AppError } from '@shared/utils/errors';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Component that will throw an error for demonstration
const ComponentWithError = () => {
  const [shouldError, setShouldError] = useState(false);
  
  if (shouldError) {
    throw new Error('This is a simulated component error');
  }
  
  return (
    <div className="space-y-4 p-4 border rounded-md">
      <h3 className="text-lg font-medium">Error Boundary Demo</h3>
      <p className="text-muted-foreground">
        Click the button below to simulate a component error that will be caught by the ErrorBoundary.
      </p>
      <Button 
        variant="destructive" 
        onClick={() => setShouldError(true)}
      >
        Trigger Component Error
      </Button>
    </div>
  );
};

// Main example component
export const ErrorHandlingExample = () => {
  const { handleError } = useApiError();
  
  // Example query with error handling
  const { data: exampleData, error: queryError, isLoading } = useQuery({
    queryKey: ['example-data'],
    queryFn: async () => {
      try {
        return await apiRequest('GET', '/api/example');
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    // Disable retries for this example
    retry: false,
    // Disable this query from running automatically
    enabled: false
  });
  
  // Example mutation with error handling
  const { mutate: triggerApiError, isPending } = useMutation({
    mutationFn: async () => {
      // Simulate an API error
      throw new AppError('This is a simulated API error', 400, 'EXAMPLE_ERROR');
    },
    onError: (error) => {
      handleError(error);
    }
  });
  
  // Manual error handling example
  const handleManualError = () => {
    try {
      // Simulate some operation that might fail
      throw new Error('This is a manually handled error');
    } catch (error) {
      handleError(error);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Error Handling Examples</CardTitle>
        <CardDescription>
          Demonstrates different error handling techniques in the application
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="api-errors">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-errors">API Errors</TabsTrigger>
            <TabsTrigger value="error-boundary">Error Boundary</TabsTrigger>
            <TabsTrigger value="manual-handling">Manual Handling</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api-errors" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">API Error Handling</h3>
              <p className="text-muted-foreground">
                Click the button below to simulate an API error that will be handled by the useApiError hook.
              </p>
              <Button 
                variant="destructive" 
                onClick={() => triggerApiError()}
                disabled={isPending}
              >
                {isPending ? 'Triggering...' : 'Trigger API Error'}
              </Button>
            </div>
            
            <div className="p-4 border rounded-md bg-muted/50">
              <pre className="text-xs overflow-auto">
                {`// Example of using useApiError with a mutation
const { handleError } = useApiError();

const { mutate } = useMutation({
  mutationFn: async (data) => {
    // Your API call here
  },
  onError: (error) => {
    handleError(error);
  }
});`}
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="error-boundary" className="mt-4">
            <ErrorBoundary>
              <ComponentWithError />
            </ErrorBoundary>
            
            <div className="p-4 border rounded-md bg-muted/50 mt-4">
              <pre className="text-xs overflow-auto">
                {`// Example of using ErrorBoundary
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>`}
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="manual-handling" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Manual Error Handling</h3>
              <p className="text-muted-foreground">
                Click the button below to simulate a manually caught error.
              </p>
              <Button 
                variant="destructive" 
                onClick={handleManualError}
              >
                Trigger Manual Error
              </Button>
            </div>
            
            <div className="p-4 border rounded-md bg-muted/50">
              <pre className="text-xs overflow-auto">
                {`// Example of manual error handling
const { handleError } = useApiError();

try {
  // Code that might throw an error
} catch (error) {
  handleError(error);
}`}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mr-2" />
          Errors will be displayed as toast notifications
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          All errors are properly handled
        </div>
      </CardFooter>
    </Card>
  );
};

export default ErrorHandlingExample; 