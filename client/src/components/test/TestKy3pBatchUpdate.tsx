/**
 * KY3P Batch Update Test Component
 * 
 * This component provides a UI for testing the KY3P batch update functionality.
 * It allows users to enter KYB-style form data (key-value pairs) and convert it
 * to the KY3P format (array of fieldId/value objects) using the test endpoint.
 */
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { convertToKy3pResponseFormat } from "../forms/ky3p-batch-update";

export default function TestKy3pBatchUpdate() {
  const [taskId, setTaskId] = useState<string>('123');
  const [responseData, setResponseData] = useState<string>(`{
  "field_1": "Test value 1",
  "field_2": "Test value 2",
  "field_3": "Test value 3",
  "field_with_comma": "Test, with, commas",
  "field_with_quotes": "Test \\"quoted\\" value",
  "_metadata": "This should be filtered out",
  "_form_version": "This should be filtered out too"
}`);
  
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // In-memory demonstration of the conversion
  const handleLocalConversion = () => {
    try {
      const parsedData = JSON.parse(responseData);
      const convertedData = convertToKy3pResponseFormat(parsedData);
      
      // Calculate the number of non-metadata fields
      const nonMetadataCount = Object.keys(parsedData)
        .filter(key => !key.startsWith('_'))
        .length;
      
      setResult({
        original: {
          format: 'object',
          keyCount: Object.keys(parsedData).length,
          keys: Object.keys(parsedData)
        },
        converted: {
          format: 'array',
          responseCount: convertedData.length,
          sample: convertedData.slice(0, 5)
        },
        validation: {
          expected: nonMetadataCount,
          actual: convertedData.length,
          success: nonMetadataCount === convertedData.length
        }
      });
      
      setError(null);
    } catch (err) {
      setError(`Error parsing JSON: ${err instanceof Error ? err.message : String(err)}`);
      setResult(null);
    }
  };
  
  // API-based test using the test endpoint
  const handleApiTest = async () => {
    try {
      setLoading(true);
      
      // Parse the response data
      const parsedData = JSON.parse(responseData);
      
      // Prepare the request payload in the format expected by the server
      const requestData = { responses: parsedData };
      
      // Make the API request
      const response = await fetch(`/api/test/ky3p-batch-update/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      // Process the response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.message || response.statusText}`);
      }
      
      const apiResult = await response.json();
      
      // Count the filtered keys (non-metadata keys)
      const filteredKeyCount = Object.keys(parsedData)
        .filter(key => !key.startsWith('_'))
        .length;
      
      // Update the result with validation
      setResult({
        ...apiResult,
        validation: {
          expected: filteredKeyCount,
          actual: apiResult.converted.responseCount,
          success: apiResult.converted.responseCount === filteredKeyCount
        }
      });
      
      setError(null);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-2xl font-bold mb-4">KY3P Batch Update Format Conversion Test</h1>
      <p className="text-gray-600 mb-6">
        This component tests the conversion between KYB and KY3P response formats.
        Enter JSON data in KYB format (key-value pairs) and convert it to KY3P format (array of objects).
      </p>
      
      <Tabs defaultValue="local">
        <TabsList className="mb-4">
          <TabsTrigger value="local">Local Conversion</TabsTrigger>
          <TabsTrigger value="api">API Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="local">
          <Card>
            <CardHeader>
              <CardTitle>Local Format Conversion Test</CardTitle>
              <CardDescription>
                Test the conversion function directly in the browser without making an API call.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Response Data (JSON format)
                  </label>
                  <Textarea 
                    value={responseData}
                    onChange={(e) => setResponseData(e.target.value)}
                    rows={8}
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleLocalConversion}>
                Convert Format
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Test</CardTitle>
              <CardDescription>
                Test the server-side conversion using the test endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Task ID
                  </label>
                  <Input 
                    type="text"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Response Data (JSON format)
                  </label>
                  <Textarea 
                    value={responseData}
                    onChange={(e) => setResponseData(e.target.value)}
                    rows={8}
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleApiTest} disabled={loading}>
                {loading ? 'Testing...' : 'Test API Conversion'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {result && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span>Conversion Result</span>
              {result.validation?.success ? (
                <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="ml-2 h-5 w-5 text-amber-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium">Original Format (KYB)</h3>
                  <p>Format: {result.original.format}</p>
                  <p>Total Keys: {result.original.keyCount}</p>
                  <p>Sample Keys: {result.original.keys.slice(0, 3).join(', ')}{result.original.keys.length > 3 ? '...' : ''}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Converted Format (KY3P)</h3>
                  <p>Format: {result.converted.format}</p>
                  <p>Response Count: {result.converted.responseCount}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center my-4">
                <code className="text-sm bg-gray-100 p-2 rounded">
                  {JSON.stringify(result.original.keys.filter(k => !k.startsWith('_'))[0])} = "value"
                </code>
                <ArrowRight className="mx-4" />
                <code className="text-sm bg-gray-100 p-2 rounded">
                  {`{ fieldId: "${result.original.keys.filter(k => !k.startsWith('_'))[0]}", value: "value" }`}
                </code>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Converted Data Sample</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                  {JSON.stringify(result.converted.sample, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Validation</h3>
                <p>Expected Items: {result.validation.expected} (non-metadata fields)</p>
                <p>Actual Items: {result.validation.actual}</p>
                <p className={`font-medium ${result.validation.success ? 'text-green-600' : 'text-amber-600'}`}>
                  {result.validation.success 
                    ? '✅ Success: All non-metadata fields were properly converted' 
                    : '⚠️ Warning: Conversion count mismatch'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}