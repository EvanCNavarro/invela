import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSkeleton, FinTechDashboardSkeleton } from "@/components/dashboard/SkeletonWidgets";

interface TutorialLoadingOverlayProps {
  isLoading: boolean;
  tabName: string;
  companyCategory?: string;
}

/**
 * A loading overlay that blocks interaction with the page while a tutorial is loading
 * This component renders different skeleton loaders based on the tab name
 * and adds a translucent overlay to prevent interaction until the tutorial is ready
 */
export function TutorialLoadingOverlay({ 
  isLoading, 
  tabName,
  companyCategory = "Invela"
}: TutorialLoadingOverlayProps) {
  if (!isLoading) return null;
  
  // Normalize tab name for comparison
  const normalizedTabName = tabName.toLowerCase().trim();
  
  // Render different skeleton loaders based on tab name
  const renderSkeletonContent = () => {
    switch (normalizedTabName) {
      case 'dashboard':
        return companyCategory === "FinTech" 
          ? <FinTechDashboardSkeleton /> 
          : <DashboardSkeleton />;
      
      case 'risk-score-configuration':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            </div>
          </div>
        );
        
      case 'file-vault':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 border rounded-md">
                <Skeleton className="h-6 w-1/3" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
              <div className="flex justify-between items-center p-2 border rounded-md">
                <Skeleton className="h-6 w-1/4" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
              <div className="flex justify-between items-center p-2 border rounded-md">
                <Skeleton className="h-6 w-1/2" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'claims':
      case 'claims-risk':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-[400px] w-full rounded-lg" />
              </div>
              <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-[400px] w-full rounded-lg" />
              </div>
            </div>
          </div>
        );
        
      case 'network':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
              <Skeleton className="h-9 w-36" />
            </div>
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </div>
        );
        
      // Default skeleton for any other tab
      default:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-[200px] col-span-3" />
              <Skeleton className="h-[250px] col-span-2" />
              <Skeleton className="h-[250px] col-span-1" />
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col pointer-events-auto">
      {/* Fully-blocking overlay with transparency */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm pointer-events-auto" />
      
      {/* Skeleton content with reduced opacity to show it's not interactive */}
      <div className="relative flex-1 p-6 overflow-hidden opacity-70 pointer-events-none">
        {renderSkeletonContent()}
      </div>
      
      {/* Loading indicator in the center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-background border border-border rounded-lg shadow-lg p-6 flex flex-col items-center max-w-md">
          <div className="mb-4 flex space-x-3">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse delay-150" />
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse delay-300" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Loading Tutorial
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Please wait while we prepare your experience. This page will be interactive once the tutorial is ready.
          </p>
        </div>
      </div>
    </div>
  );
}