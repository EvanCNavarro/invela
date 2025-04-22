/**
 * Debug Demo Auto-fill Button
 * 
 * This component adds a special debug version of the demo auto-fill button
 * that traces each step of the process with detailed logging.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { KY3PFormService } from '@/services/ky3p-form-service';

const logger = getLogger('DemoAutofillDebug');

interface DebugDemoAutofillProps {
  taskId: number;
  taskType: string;
}

export function DebugDemoAutofill({ taskId, taskType }: DebugDemoAutofillProps) {
  const handleClick = async () => {
    if (!taskId) {
      toast({
        variant: "destructive",
        title: "Debug Failed",
        description: "No task ID available for demo auto-fill debug",
      });
      return;
    }

    try {
      logger.info(`[DEBUG] Starting demo auto-fill debug for task ${taskId}`);
      
      // Only works for KY3P tasks
      if (taskType !== 'ky3p') {
        toast({
          variant: "destructive",
          title: "Debug Failed",
          description: "This debug tool only works for KY3P tasks",
        });
        return;
      }

      toast({
        title: "Debug Starting",
        description: "Starting demo auto-fill debug process...",
        duration: 5000,
      });

      // STEP 1: Fetch the demo data from the API
      logger.info(`[DEBUG] Step 1: Fetching demo data from API for task ${taskId}`);
      const demoDataResponse = await fetch(`/api/ky3p/demo-autofill/${taskId}`);
      
      if (!demoDataResponse.ok) {
        const errorText = await demoDataResponse.text();
        logger.error(`[DEBUG] Step 1 FAILED: Demo data fetch failed: ${demoDataResponse.status}`, errorText);
        toast({
          variant: "destructive",
          title: "Debug Step 1 Failed",
          description: `Demo data fetch failed: ${demoDataResponse.status} - ${errorText}`,
        });
        return;
      }
      
      const demoData = await demoDataResponse.json();
      
      logger.info(`[DEBUG] Step 1 SUCCESS: Got ${Object.keys(demoData).length} demo fields from API:`, {
        sampleKeys: Object.keys(demoData).slice(0, 5),
        sampleValues: Object.values(demoData).slice(0, 5),
      });

      // STEP 2: Initialize the form service
      logger.info(`[DEBUG] Step 2: Initializing KY3P form service for task ${taskId}`);
      const formService = new KY3PFormService(undefined, taskId);
      
      try {
        await formService.initialize();
        logger.info(`[DEBUG] Step 2 SUCCESS: Form service initialized`);
      } catch (error) {
        logger.error(`[DEBUG] Step 2 FAILED: Form service initialization failed:`, error);
        toast({
          variant: "destructive",
          title: "Debug Step 2 Failed",
          description: "Form service initialization failed",
        });
        return;
      }

      // STEP 3: Get all fields to map keys to IDs
      logger.info(`[DEBUG] Step 3: Getting all KY3P fields for mapping`);
      let allFields;
      try {
        allFields = await formService.getFields();
        logger.info(`[DEBUG] Step 3 SUCCESS: Got ${allFields.length} fields for mapping`, {
          sampleFields: allFields.slice(0, 3).map(f => ({ id: f.id, key: f.key })),
        });
      } catch (error) {
        logger.error(`[DEBUG] Step 3 FAILED: Failed to get fields for mapping:`, error);
        toast({
          variant: "destructive",
          title: "Debug Step 3 Failed",
          description: "Failed to get fields for mapping",
        });
        return;
      }

      // STEP 4: Convert field keys to field IDs
      logger.info(`[DEBUG] Step 4: Converting field keys to field IDs`);
      
      // Create a map of field key to field ID for quick lookup
      const fieldKeyToIdMap = new Map(
        allFields.map(field => [field.key, field.id])
      );
      
      // Convert to array format with explicit fieldId property
      const responsesArray = [];
      let validCount = 0;
      let invalidCount = 0;
      
      for (const [key, value] of Object.entries(demoData)) {
        const fieldId = fieldKeyToIdMap.get(key);
        
        if (fieldId !== undefined) {
          // Ensure field ID is a number
          const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
          
          if (!isNaN(numericFieldId)) {
            responsesArray.push({
              fieldId: numericFieldId,
              value: value
            });
            validCount++;
          } else {
            logger.warn(`[DEBUG] Invalid field ID for key ${key}: ${fieldId}`);
            invalidCount++;
          }
        } else {
          logger.warn(`[DEBUG] Field key not found: ${key}`);
          invalidCount++;
        }
      }
      
      logger.info(`[DEBUG] Step 4 SUCCESS: Converted ${validCount} fields to array format (${invalidCount} invalid/not found)`, {
        firstFew: responsesArray.slice(0, 3),
      });

      // STEP 5: Send the bulk update request with the array format
      logger.info(`[DEBUG] Step 5: Sending bulk update request to server`);
      
      // Log the exact request body being sent
      const requestBody = {
        responses: responsesArray
      };
      logger.info(`[DEBUG] Request body:`, JSON.stringify(requestBody).substring(0, 500) + '...');
      
      try {
        const response = await fetch(`/api/tasks/${taskId}/ky3p-responses/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[DEBUG] Step 5 FAILED: Bulk update failed: ${response.status}`, errorText);
          toast({
            variant: "destructive",
            title: "Debug Step 5 Failed",
            description: `Bulk update failed: ${response.status} - ${errorText}`,
          });
          return;
        }
        
        const result = await response.json();
        logger.info(`[DEBUG] Step 5 SUCCESS: Bulk update successful:`, result);
        
        toast({
          title: "Debug Completed",
          description: `Successfully updated ${validCount} fields!`,
        });
      } catch (error) {
        logger.error(`[DEBUG] Step 5 FAILED: Error during bulk update:`, error);
        toast({
          variant: "destructive",
          title: "Debug Step 5 Failed",
          description: "Error during bulk update",
        });
      }
    } catch (error) {
      logger.error('[DEBUG] Unexpected error during debug process:', error);
      toast({
        variant: "destructive",
        title: "Debug Process Failed",
        description: "An unexpected error occurred during the debug process",
      });
    }
  };

  return (
    <Button 
      onClick={handleClick}
      variant="destructive" 
      size="sm" 
      className="ml-2"
    >
      Debug Auto-Fill
    </Button>
  );
}