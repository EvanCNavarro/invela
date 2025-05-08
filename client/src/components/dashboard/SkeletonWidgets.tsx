import { Widget } from "@/components/dashboard/Widget";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Bell, Zap, Building2, Globe, Shield } from "lucide-react";

/**
 * Skeleton loader for a default widget with adaptive sizes
 */
export function SkeletonWidget({ 
  title, 
  icon, 
  size = "single" 
}: { 
  title: string;
  icon: React.ReactNode;
  size?: "single" | "double" | "triple";
}) {
  return (
    <Widget
      title={title}
      icon={icon}
      size={size}
      isVisible={true}
    >
      <div className="w-full space-y-4">
        <Skeleton className="h-24 w-full" />
        {size !== "single" && <Skeleton className="h-24 w-full" />}
        {size === "triple" && <Skeleton className="h-24 w-full" />}
      </div>
    </Widget>
  );
}

/**
 * Skeleton loader for the Recent Updates widget
 */
export function SkeletonUpdatesWidget() {
  return (
    <Widget
      title="Recent Updates"
      icon={<Activity className="h-5 w-5" />}
      size="double"
      isVisible={true}
    >
      <div className="space-y-4">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    </Widget>
  );
}

/**
 * Skeleton loader for the Announcements widget
 */
export function SkeletonAnnouncementsWidget() {
  return (
    <Widget
      title="Announcements"
      icon={<Bell className="h-5 w-5" />}
      isVisible={true}
    >
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
    </Widget>
  );
}

/**
 * Skeleton loader for the Quick Actions widget
 */
export function SkeletonQuickActionsWidget() {
  return (
    <Widget
      title="Quick Actions"
      icon={<Zap className="h-5 w-5" />}
      size="double"
      isVisible={true}
    >
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Widget>
  );
}

/**
 * Skeleton loader for the Company Snapshot widget
 */
export function SkeletonCompanySnapshotWidget() {
  return (
    <Widget
      title="Company Snapshot"
      icon={<Building2 className="h-5 w-5" />}
      isVisible={true}
      headerClassName="pb-2"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4 rounded-lg" />
        
        {/* Company Banner */}
        <div className="bg-muted/50 rounded-lg py-3 px-4 flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-[120px]" />
        </div>
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg shadow-sm">
            <Skeleton className="h-3 w-[80%] mx-auto mb-1" />
            <div className="flex justify-center my-1">
              <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="h-10 w-16 mx-auto" />
          </div>
          <div className="p-3 border rounded-lg shadow-sm">
            <Skeleton className="h-3 w-[80%] mx-auto mb-1" />
            <div className="flex justify-center my-1">
              <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="h-10 w-16 mx-auto" />
          </div>
        </div>
        
        {/* Bottom Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border border-blue-500 border-2 rounded-lg shadow-sm flex flex-col items-center">
            <Skeleton className="h-6 w-6 my-1" />
            <div className="text-center">
              <Skeleton className="h-3 w-24 mx-auto" />
              <Skeleton className="h-3 w-20 mx-auto mb-1" />
              <Skeleton className="h-12 w-10 mx-auto" />
            </div>
          </div>
          <div className="p-3 border border-green-500 border-2 rounded-lg shadow-sm flex flex-col items-center">
            <Skeleton className="h-6 w-6 my-1" />
            <div className="text-center">
              <Skeleton className="h-3 w-24 mx-auto mb-2" />
              <Skeleton className="h-8 w-20 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}

/**
 * Skeleton loader for the Network Visualization widget
 */
export function SkeletonNetworkVisualizationWidget() {
  return (
    <Widget
      title="Network Visualization"
      icon={<Globe className="h-5 w-5" />}
      size="triple"
      isVisible={true}
    >
      <div className="space-y-4 py-2">
        <div className="flex justify-between items-center px-3">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    </Widget>
  );
}

/**
 * Skeleton loader for the Risk Radar widget
 */
export function SkeletonRiskRadarWidget() {
  return (
    <Widget
      title="Risk Radar"
      icon={<Shield className="h-5 w-5" />}
      size="triple"
      isVisible={true}
    >
      <div className="space-y-4 py-2">
        <div className="flex justify-center items-center">
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
        <Skeleton className="h-[350px] w-[350px] mx-auto rounded-full" />
        <div className="flex justify-between px-8">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </Widget>
  );
}

/**
 * Dashboard skeleton that shows all widget skeletons
 */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Quick Actions takes full width at the top */}
      <div className="col-span-3">
        <SkeletonQuickActionsWidget />
      </div>
      
      {/* Two widgets in the middle */}
      <div className="col-span-2">
        <SkeletonCompanySnapshotWidget />
      </div>
      <div className="col-span-1">
        <SkeletonCompanySnapshotWidget />
      </div>
      
      {/* Network Visualization at the bottom */}
      <div className="col-span-3">
        <SkeletonNetworkVisualizationWidget />
      </div>
    </div>
  );
}

/**
 * Dashboard skeleton for FinTech users
 */
export function FinTechDashboardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Quick Actions takes full width at the top */}
      <div className="col-span-3">
        <SkeletonQuickActionsWidget />
      </div>
      
      {/* Two widgets in the middle */}
      <div className="col-span-2">
        <SkeletonCompanySnapshotWidget />
      </div>
      <div className="col-span-1">
        <SkeletonCompanySnapshotWidget />
      </div>
      
      {/* Risk Radar at the bottom */}
      <div className="col-span-3">
        <SkeletonRiskRadarWidget />
      </div>
    </div>
  );
}