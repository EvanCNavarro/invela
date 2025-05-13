import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Enhanced loading state that combines both skeleton UI and spinner
 * for a smoother loading experience
 * 
 * This component shows a skeleton UI of the claims table with a centered loading spinner
 * to provide visual feedback while data is being fetched
 */
export function ClaimsTableLoadingSkeleton() {
  return (
    <div className="space-y-4 relative">
      {/* Skeleton UI overlay with improved animations */}
      <div className="animate-fade-in transition-opacity duration-500">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-10 w-[80px] skeleton-shimmer" />
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]"><Skeleton className="h-4 w-[80px] animate-skeleton-pulse" /></TableHead>
                <TableHead className="w-[150px]"><Skeleton className="h-4 w-[100px] animate-skeleton-pulse" /></TableHead>
                <TableHead className="w-[150px]"><Skeleton className="h-4 w-[100px] animate-skeleton-pulse" /></TableHead>
                <TableHead className="w-[120px]"><Skeleton className="h-4 w-[80px] animate-skeleton-pulse" /></TableHead>
                <TableHead className="w-[120px] text-right"><Skeleton className="h-4 w-[80px] ml-auto animate-skeleton-pulse" /></TableHead>
                <TableHead className="w-[150px]"><Skeleton className="h-4 w-[100px] animate-skeleton-pulse" /></TableHead>
                <TableHead className="w-[80px] text-right"><Skeleton className="h-4 w-[40px] ml-auto animate-skeleton-pulse" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, i) => (
                <TableRow key={i} className="h-[55px]">
                  <TableCell><Skeleton className="h-4 w-[100px] skeleton-shimmer" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px] skeleton-shimmer" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px] skeleton-shimmer" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px] skeleton-shimmer" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto skeleton-shimmer" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[120px] skeleton-shimmer" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-[30px] ml-auto skeleton-shimmer" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Center loading spinner */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-80 z-10 animate-pulse-subtle">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-muted-foreground">Loading claims...</p>
      </div>
    </div>
  );
}