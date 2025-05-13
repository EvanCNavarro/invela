import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import Ky3pSubmitButton from "./Ky3pSubmitButton";

/**
 * KY3P Form Integration Example
 * 
 * This component demonstrates how to integrate the Ky3pSubmitButton into
 * an existing KY3P form to enable the proper submission of KY3P forms.
 * 
 * Note: This is an example and not meant to be used directly. The actual 
 * implementation would be integrated into your existing KY3P form component.
 */
export default function Ky3pFormIntegrationExample() {
  const { taskId: taskIdParam } = useParams<{ taskId: string }>();
  const taskId = parseInt(taskIdParam || "0", 10);
  const [formProgress, setFormProgress] = useState<number>(0);
  const [isFormReady, setIsFormReady] = useState<boolean>(false);

  // Simulate form data loading and progress calculation
  useEffect(() => {
    if (taskId <= 0) return;

    // Simulated data loading
    const timer = setTimeout(() => {
      // In a real implementation, this would be calculated based on
      // actual form field completion
      setFormProgress(100);
      setIsFormReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [taskId]);

  // Handle successful form submission
  const handleFormSubmitSuccess = () => {
    console.log("KY3P form submitted successfully with taskId:", taskId);
  };

  // Display a message when no valid task ID is provided
  if (taskId <= 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>KY3P Form</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>No Task ID Provided</AlertTitle>
            <AlertDescription>
              Please provide a valid task ID to load the KY3P form.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>KY3P Form for Task {taskId}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* This would be your actual KY3P form fields */}
        <div className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Form Integration Example</AlertTitle>
            <AlertDescription>
              This is an example showing how to integrate the KY3P submission button.
              In your actual implementation, this would contain your form fields.
            </AlertDescription>
          </Alert>

          <div className="py-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Form Progress</span>
              <span className="text-sm">{formProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${formProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <Separator />
      
      <CardFooter className="flex justify-between mt-4">
        <span className="text-sm text-muted-foreground">
          {isFormReady
            ? "Your form is ready for submission"
            : "Please complete all required fields"}
        </span>
        
        {/* This is the key component - our specialized KY3P submit button */}
        <Ky3pSubmitButton
          taskId={taskId}
          disabled={!isFormReady}
          onSuccess={handleFormSubmitSuccess}
        />
      </CardFooter>
    </Card>
  );
}