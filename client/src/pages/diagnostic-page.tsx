import React, { useState, useEffect } from 'react';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DiagnosticPage() {
  const [kybFieldsResponse, setKybFieldsResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKybFields = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to fetch KYB fields...');
      const response = await fetch('/api/kyb/fields');
      console.log('Raw response received:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Response parsed successfully:', {
        success: data.success,
        fieldsLength: data.fields?.length,
        dataType: typeof data
      });
      
      setKybFieldsResponse(data);
    } catch (err) {
      console.error('Error fetching KYB fields:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">API Diagnostic Tool</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>KYB Fields API Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button 
              onClick={fetchKybFields} 
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Test /api/kyb/fields Endpoint'}
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {kybFieldsResponse && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Response Details:</h3>
              <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-sm">
                  <strong>Success:</strong> {kybFieldsResponse.success ? 'Yes' : 'No'}
                  <br />
                  <strong>Fields Count:</strong> {kybFieldsResponse.fields?.length || 0}
                  <br />
                  <strong>Sample Field:</strong> <br />
                  {kybFieldsResponse.fields?.length > 0 
                    ? JSON.stringify(kybFieldsResponse.fields[0], null, 2) 
                    : 'No fields available'}
                  <br />
                  <strong>All Fields:</strong> <br />
                  {JSON.stringify(kybFieldsResponse.fields || [], null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}