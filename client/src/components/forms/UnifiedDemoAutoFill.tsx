/**
 * Unified Demo Auto-Fill component for all form types
 * 
 * This component provides a standardized interface for auto-filling forms
 * with demo data regardless of the form type, ensuring consistent handling.
 */

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileOutput, RefreshCw, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UnifiedDemoAutoFillProps {
  taskId: number;
  taskType: 'kyb' | 'ky3p' | 'open_banking' | 'company_kyb';
  onSuccess?: () => void;
  className?: string;
}

/**
 * UnifiedDemoAutoFill Component
 * 
 * Provides a user interface for applying demo data to forms using the unified demo service API.
 * Works consistently across all form types (KYB, KY3P, Open Banking).
 */
export default function UnifiedDemoAutoFill({ taskId, taskType, onSuccess, className = '' }: UnifiedDemoAutoFillProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  
  // Mutation for applying demo data
  const applyDemoData = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/unified-demo/apply/${taskId}`);
      return res.json();
    },
    onSuccess: (data) => {
      console.log('[UnifiedDemoAutoFill] Successfully applied demo data:', data);
      
      // Show success toast
      toast({
        title: "Demo data applied",
        description: `Successfully populated all fields with demo data.`,
        variant: "default",
      });
      
      // Invalidate queries to refresh data
      invalidateRelevantQueries();
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      console.error('[UnifiedDemoAutoFill] Error applying demo data:', error);
      
      toast({
        title: "Error applying demo data",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for clearing form data
  const clearFormData = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/unified-demo/clear/${taskId}`);
      return res.json();
    },
    onSuccess: (data) => {
      console.log('[UnifiedDemoAutoFill] Successfully cleared form data:', data);
      
      toast({
        title: "Form cleared",
        description: `Successfully cleared all form fields.`,
        variant: "default",
      });
      
      // Invalidate queries to refresh data
      invalidateRelevantQueries();
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      console.error('[UnifiedDemoAutoFill] Error clearing form data:', error);
      
      toast({
        title: "Error clearing form",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Helper to invalidate the appropriate queries based on task type
  const invalidateRelevantQueries = () => {
    // Base API path for each form type
    const apiPaths: Record<string, string> = {
      'kyb': '/api/kyb-responses',
      'company_kyb': '/api/kyb-responses',
      'ky3p': '/api/ky3p-responses',
      'open_banking': '/api/open-banking-responses',
    };
    
    // Invalidate the appropriate query
    const basePath = apiPaths[taskType];
    if (basePath) {
      queryClient.invalidateQueries({ queryKey: [`${basePath}/${taskId}`] });
    }
    
    // Also invalidate the task itself to update progress
    queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  };
  
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center">
          <FileOutput className="w-5 h-5 mr-2" />
          <span>Demo Auto-Fill</span>
        </CardTitle>
        {!expanded && (
          <CardDescription>
            Populate this form with realistic demo data.
          </CardDescription>
        )}
      </CardHeader>
      
      {expanded && (
        <>
          <CardContent className="pt-2">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>This is for demonstration purposes only</AlertTitle>
              <AlertDescription>
                Using demo auto-fill will populate all form fields with pre-defined data.
                This will overwrite any existing data in the form.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Task ID:</strong> {taskId}
              </p>
              <p className="text-sm">
                <strong>Form Type:</strong> {taskType === 'company_kyb' ? 'KYB' : 
                  taskType === 'ky3p' ? 'KY3P' : 
                  taskType === 'open_banking' ? 'Open Banking' : taskType}
              </p>
              <p className="text-sm">
                Demo auto-fill will set form progress to 100% and mark all fields as complete.
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearFormData.mutate()}
              disabled={clearFormData.isPending}
              className="text-destructive hover:text-destructive"
            >
              {clearFormData.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Clear Form
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => applyDemoData.mutate()}
              disabled={applyDemoData.isPending}
            >
              {applyDemoData.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Apply Demo Data
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
