/**
 * ========================================
 * Chart Error Boundary Component
 * ========================================
 * 
 * Robust error boundary specifically designed for chart components.
 * Provides graceful degradation when chart rendering fails.
 * 
 * @module components/ui/chart-error-boundary
 * @version 1.0.0
 * @since 2025-06-01
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface ChartErrorBoundaryProps {
  children: ReactNode;
  chartName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

/**
 * Error boundary component for chart components
 * Catches JavaScript errors anywhere in the chart component tree
 */
export class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with detailed context
    const errorContext = {
      chartName: this.props.chartName || 'Unknown Chart',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    };

    console.error('[ChartErrorBoundary] Chart rendering error:', errorContext);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.info(`[ChartErrorBoundary] Retrying chart render (${this.state.retryCount + 1}/${this.maxRetries})`);
      
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReportError = () => {
    const errorReport = {
      chartName: this.props.chartName,
      error: this.state.error?.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    console.warn('[ChartErrorBoundary] Error report generated:', errorReport);
    
    // In production, this could send to error reporting service
    // For now, just copy to clipboard for debugging
    navigator.clipboard?.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => console.info('[ChartErrorBoundary] Error details copied to clipboard'))
      .catch(() => console.warn('[ChartErrorBoundary] Could not copy error details'));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Chart Loading Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {this.props.chartName ? (
                <p>Unable to render <span className="font-medium">{this.props.chartName}</span> chart component.</p>
              ) : (
                <p>Unable to render chart component.</p>
              )}
              <p className="mt-1">This may be due to data formatting issues or library conflicts.</p>
            </div>

            {this.state.error && (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs font-mono text-muted-foreground mb-1">Error Details:</p>
                <p className="text-xs font-mono text-destructive">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex gap-2">
              {this.state.retryCount < this.maxRetries && (
                <Button 
                  onClick={this.handleRetry}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry ({this.maxRetries - this.state.retryCount} left)
                </Button>
              )}
              
              <Button 
                onClick={this.handleReportError}
                size="sm"
                variant="ghost"
                className="flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Copy Error Details
              </Button>
            </div>

            {this.state.retryCount >= this.maxRetries && (
              <div className="text-xs text-muted-foreground">
                Maximum retry attempts reached. Please refresh the page or contact support if the issue persists.
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap charts with error boundary
 */
export function withChartErrorBoundary<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  chartName?: string
) {
  const ComponentWithErrorBoundary = (props: T) => (
    <ChartErrorBoundary chartName={chartName}>
      <WrappedComponent {...props} />
    </ChartErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withChartErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithErrorBoundary;
}