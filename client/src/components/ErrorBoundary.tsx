/**
 * @file ErrorBoundary.tsx
 * @description React error boundary component for catching and displaying UI errors.
 * Prevents the entire application from crashing when a component throws an error.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * Props for the ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  /** The child components to render and monitor for errors */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
}

/**
 * State for the ErrorBoundary component.
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred, if any */
  error: Error | null;
}

/**
 * Error boundary component that catches JavaScript errors in its child component tree.
 * Displays a fallback UI instead of crashing the whole application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  /**
   * Static lifecycle method called when an error is thrown in a child component.
   * Updates the component state to indicate an error has occurred.
   * 
   * @param error - The error that was thrown
   * @returns New state object with error information
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.log('[ErrorBoundary] Error caught in getDerivedStateFromError:', error.message);
    return {
      hasError: true,
      error
    };
  }

  /**
   * Lifecycle method called after an error is caught.
   * Used for logging error information for debugging.
   * 
   * @param error - The error that was thrown
   * @param errorInfo - Additional information about the error
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Error caught:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    // Here you could log the error to an error reporting service
  }

  /**
   * Resets the error boundary state to allow recovery from errors.
   * Called when the user clicks the "Try Again" button.
   */
  resetErrorBoundary = (): void => {
    console.log('[ErrorBoundary] Resetting error state');
    this.setState({
      hasError: false,
      error: null
    });
  };

  /**
   * Renders either the children or the fallback UI depending on whether an error occurred.
   * 
   * @returns The rendered component
   */
  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-background border rounded-lg shadow-sm">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <Button 
              onClick={this.resetErrorBoundary}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary; 