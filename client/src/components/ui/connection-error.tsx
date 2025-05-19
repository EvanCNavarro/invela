import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

interface ConnectionErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * A user-friendly error component for database connection errors
 * 
 * Displays a visually appealing error card with optional retry functionality
 * Designed to match the application's visual style and provide meaningful feedback
 */
export function ConnectionError({
  title = "Connection Error",
  message = "We're having trouble connecting to our database right now. This is often temporary - please try again in a moment.",
  onRetry,
  showRetry = true
}: ConnectionErrorProps) {
  return (
    <Card className="w-full max-w-md mx-auto border-red-200 bg-red-50/50 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-red-700">{title}</CardTitle>
        </div>
        <CardDescription className="text-red-600/90">
          Our system is currently experiencing high demand
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-700">{message}</p>
      </CardContent>
      {showRetry && onRetry && (
        <CardFooter>
          <Button 
            onClick={onRetry} 
            variant="outline" 
            className="w-full border-red-200 hover:bg-red-100/50 text-red-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}