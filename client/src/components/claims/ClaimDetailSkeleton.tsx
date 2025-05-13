import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

/**
 * ClaimDetailSkeleton Component
 * 
 * A comprehensive skeleton loading state for claim detail pages that shows
 * the page structure while data is being loaded
 */
export function ClaimDetailSkeleton() {
  return (
    <div className="space-y-6 w-full relative">
      {/* Skeleton UI with enhanced animations */}
      <div className="animate-fade-in transition-opacity duration-500">
        {/* Breadcrumb and back button skeletons */}
        <div className="flex flex-col px-6 space-y-4 mb-6">
          <div className="flex items-center space-x-2 py-4">
            <Skeleton className="h-4 w-[200px] skeleton-shimmer" />
          </div>
          <Skeleton className="h-10 w-[150px] skeleton-shimmer" />
        </div>
        
        {/* Header Skeleton */}
        <div className="px-6 mb-6">
          <Skeleton className="h-8 w-[350px] mb-1 skeleton-shimmer" />
          <Skeleton className="h-5 w-[250px] skeleton-shimmer" />
        </div>
        
        {/* Main content skeleton */}
        <div className="px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Claim information card */}
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-[150px] mb-1 animate-skeleton-pulse" />
                  <Skeleton className="h-4 w-[250px] animate-skeleton-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <Skeleton className="h-4 w-[130px] mb-4 animate-skeleton-pulse" />
                      <div className="space-y-4">
                        {Array(3).fill(0).map((_, i) => (
                          <div key={`left-${i}`} className="space-y-2">
                            <Skeleton className="h-4 w-[100px] mb-1 skeleton-shimmer" />
                            <Skeleton className="h-4 w-[150px] skeleton-shimmer" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Skeleton className="h-4 w-[130px] mb-4 animate-skeleton-pulse" />
                      <div className="space-y-4">
                        {Array(3).fill(0).map((_, i) => (
                          <div key={`right-${i}`} className="space-y-2">
                            <Skeleton className="h-4 w-[100px] mb-1 skeleton-shimmer" />
                            <Skeleton className="h-4 w-[150px] skeleton-shimmer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabs skeleton */}
              <Tabs defaultValue="placeholder">
                <TabsList className="grid w-full grid-cols-3">
                  {Array(3).fill(0).map((_, i) => (
                    <TabsTrigger key={`tab-${i}`} value={`placeholder-${i}`} disabled>
                      <Skeleton className="h-4 w-[80px] animate-skeleton-pulse" />
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value="placeholder" className="mt-4">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-5 w-[150px] mb-1 animate-skeleton-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array(5).fill(0).map((_, i) => (
                          <div key={`content-${i}`} className="grid grid-cols-4 p-3 border-b">
                            {Array(4).fill(0).map((_, j) => (
                              <div key={`cell-${i}-${j}`} className={j === 3 ? 'text-right' : ''}>
                                <Skeleton 
                                  className={`h-4 w-[${j === 3 ? 80 : 120}px] ${j === 3 ? 'ml-auto' : ''} skeleton-shimmer`}
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="space-y-6">
              {/* Bank information card */}
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-[130px] animate-skeleton-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    <Skeleton className="h-10 w-10 rounded-full animate-skeleton-pulse" />
                    <div>
                      <Skeleton className="h-5 w-[150px] skeleton-shimmer" />
                      <Skeleton className="h-4 w-[180px] mt-1 skeleton-shimmer" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={`bank-${i}`} className="space-y-2">
                        <Skeleton className="h-4 w-[80px] skeleton-shimmer" />
                        <Skeleton className="h-4 w-[150px] skeleton-shimmer" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Fintech information card */}
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-[150px] animate-skeleton-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    <Skeleton className="h-10 w-10 rounded-full animate-skeleton-pulse" />
                    <div>
                      <Skeleton className="h-5 w-[150px] skeleton-shimmer" />
                      <Skeleton className="h-4 w-[180px] mt-1 skeleton-shimmer" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={`fintech-${i}`} className="space-y-2">
                        <Skeleton className="h-4 w-[80px] skeleton-shimmer" />
                        <Skeleton className="h-4 w-[150px] skeleton-shimmer" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Actions card */}
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-[120px] animate-skeleton-pulse" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array(4).fill(0).map((_, i) => (
                    <Skeleton key={`action-${i}`} className="h-10 w-full skeleton-shimmer" />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Center loading spinner */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 animate-pulse-subtle">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Loading claim details...</p>
      </div>
    </div>
  );
}