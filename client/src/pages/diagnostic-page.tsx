import React, { useState, useEffect } from 'react';
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { kybService } from '@/services/kybService';
import { UniversalForm } from '@/components/forms';
import DiagnosticFormView from '@/components/diagnostic/DiagnosticFormView';
import getLogger from '@/utils/logger';

// Set up logger
const logger = getLogger('DiagnosticPage', { levels: { debug: true, info: true, warn: true, error: true } });

export default function DiagnosticPage() {
  const [kybFieldsResponse, setKybFieldsResponse] = useState<any>(null);
  const [kybProgressResponse, setKybProgressResponse] = useState<any>(null);
  const [formServiceData, setFormServiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number>(348); // Default to task 348 for testing

  // Parse fields to show group distribution
  const getGroupDistribution = (fields: any[]) => {
    if (!fields || !Array.isArray(fields)) return {};
    
    const groups: Record<string, number> = {};
    fields.forEach(field => {
      const group = field.group || 'Unknown';
      groups[group] = (groups[group] || 0) + 1;
    });
    
    return groups;
  };

  const fetchKybFields = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info('Attempting to fetch KYB fields...');
      const response = await fetch('/api/kyb/fields');
      logger.info('Raw response received:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.info('Response parsed successfully:', {
        success: data.success,
        fieldsLength: data.fields?.length,
        dataType: typeof data
      });
      
      // Log field groups for diagnostics
      if (data.fields && Array.isArray(data.fields)) {
        const groupDistribution = getGroupDistribution(data.fields);
        logger.info('Field group distribution:', groupDistribution);
      }
      
      setKybFieldsResponse(data);
    } catch (err) {
      console.error('Error fetching KYB fields:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKybProgress = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info(`Fetching KYB progress for task ID: ${selectedTaskId}`);
      const response = await fetch(`/api/kyb/progress/${selectedTaskId}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.info('KYB progress response:', {
        progress: data.progress,
        formDataFields: Object.keys(data.formData || {}).length
      });
      
      setKybProgressResponse(data);
    } catch (err) {
      console.error('Error fetching KYB progress:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const testFormService = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info('Initializing form service with template ID: 1');
      
      // First check if kybService has the methods we expect
      const serviceInfo = {
        type: kybService.constructor.name,
        hasInitialize: typeof kybService.initialize === 'function',
        hasGetFields: typeof kybService.getFields === 'function',
        hasGetSections: typeof kybService.getSections === 'function'
      };
      
      logger.info('KYB Service info:', serviceInfo);
      
      // Test initialize method
      await kybService.initialize(1);
      logger.info('KYB Service initialization complete');
      
      // Get fields and sections
      const fields = kybService.getFields();
      const sections = kybService.getSections();
      
      logger.info('Fields retrieved:', {
        count: fields.length,
        sample: fields.length > 0 ? fields[0] : null
      });
      
      logger.info('Sections retrieved:', {
        count: sections.length,
        names: sections.map(s => s.title)
      });
      
      // Collect results
      const result = {
        serviceInfo,
        fieldsCount: fields.length,
        sectionsCount: sections.length,
        sectionNames: sections.map(s => s.title),
        sampleField: fields.length > 0 ? fields[0] : null,
        sampleSection: sections.length > 0 ? sections[0] : null
      };
      
      setFormServiceData(result);
    } catch (err) {
      console.error('Error testing form service:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Invela Form Diagnostic Tool</h1>

      <Tabs defaultValue="api-tests">
        <TabsList className="mb-4">
          <TabsTrigger value="api-tests">API Tests</TabsTrigger>
          <TabsTrigger value="form-service">Form Service</TabsTrigger>
          <TabsTrigger value="live-form">Live Form Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-tests">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>KYB Fields API Test</CardTitle>
                <CardDescription>Fetch form field definitions from the API</CardDescription>
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
                
                {kybFieldsResponse && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Response Summary:</h3>
                    <div className="bg-green-50 p-3 rounded-md text-green-800 mb-3">
                      <p>Success: {kybFieldsResponse.success ? 'Yes' : 'No'}</p>
                      <p>Fields: {kybFieldsResponse.fields?.length || 0}</p>
                    </div>
                    
                    <h4 className="font-medium mb-1">Field Group Distribution:</h4>
                    <div className="bg-blue-50 p-3 rounded-md text-blue-800 mb-3">
                      {Object.entries(getGroupDistribution(kybFieldsResponse.fields || [])).map(([group, count]) => (
                        <div key={group} className="flex justify-between">
                          <span className="font-mono">{group}:</span> 
                          <span>{count} fields</span>
                        </div>
                      ))}
                    </div>
                    
                    <h4 className="font-medium mb-1">Sample Field:</h4>
                    <div className="bg-gray-100 p-2 rounded-md overflow-auto max-h-40">
                      <pre className="text-xs">
                        {kybFieldsResponse.fields?.length > 0 
                          ? JSON.stringify(kybFieldsResponse.fields[0], null, 2) 
                          : 'No fields available'}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-gray-500">
                  This endpoint should return all KYB field definitions from the database.
                </p>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>KYB Progress API Test</CardTitle>
                <CardDescription>Test loading saved form data for a task</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Task ID:</label>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="number"
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-20"
                    />
                    <Button 
                      onClick={fetchKybProgress} 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Test Progress API'}
                    </Button>
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {kybProgressResponse && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Progress Summary:</h3>
                    <div className="bg-green-50 p-3 rounded-md text-green-800 mb-3">
                      <p>Progress: {kybProgressResponse.progress}%</p>
                      <p>Form fields: {Object.keys(kybProgressResponse.formData || {}).length}</p>
                    </div>
                    
                    <h4 className="font-medium mb-1">Form Data Preview:</h4>
                    <div className="bg-gray-100 p-2 rounded-md overflow-auto max-h-60">
                      <pre className="text-xs">
                        {JSON.stringify(kybProgressResponse.formData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="form-service">
          <Card>
            <CardHeader>
              <CardTitle>KYB Form Service Test</CardTitle>
              <CardDescription>Test the internal form service that processes API data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button 
                  onClick={testFormService} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Testing...' : 'Test KYB Form Service'}
                </Button>
              </div>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {formServiceData && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Service Info:</h3>
                    <div className="bg-gray-100 p-3 rounded-md">
                      <p>Type: {formServiceData.serviceInfo.type}</p>
                      <p>Has initialize: {formServiceData.serviceInfo.hasInitialize ? 'Yes' : 'No'}</p>
                      <p>Has getFields: {formServiceData.serviceInfo.hasGetFields ? 'Yes' : 'No'}</p>
                      <p>Has getSections: {formServiceData.serviceInfo.hasGetSections ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Fields and Sections:</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="font-medium">Fields: {formServiceData.fieldsCount}</p>
                        {formServiceData.sampleField && (
                          <div className="mt-2 text-xs overflow-auto max-h-40">
                            <pre>{JSON.stringify(formServiceData.sampleField, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="font-medium">Sections: {formServiceData.sectionsCount}</p>
                        <p className="text-sm mt-1">Section Names:</p>
                        <ul className="list-disc list-inside text-sm">
                          {formServiceData.sectionNames.map((name: string, i: number) => (
                            <li key={i}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="live-form">
          <Card>
            <CardHeader>
              <CardTitle>Live Form Test</CardTitle>
              <CardDescription>Test the actual form component with real data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 rounded-md mb-4">
                <p>This renders a live instance of the UniversalForm component with KYB task type to see how it processes the data.</p>
              </div>
              
              <div className="bg-white border rounded-lg">
                {/* Use the dedicated diagnostic form viewer that avoids hook form errors */}
                <DiagnosticFormView
                  taskType="kyb"
                  taskId={348}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}