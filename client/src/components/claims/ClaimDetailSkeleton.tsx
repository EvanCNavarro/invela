import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedSkeleton } from '@/components/ui/enhanced-skeleton';
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
            <EnhancedSkeleton animation="wave" className="h-4 w-[200px]" />
          </div>
          <EnhancedSkeleton animation="wave" className="h-10 w-[150px]" />
        </div>
        
        {/* Header Skeleton */}
        <div className="px-6 mb-6">
          <EnhancedSkeleton animation="wave" className="h-8 w-[350px] mb-1" />
          <EnhancedSkeleton animation="wave" className="h-5 w-[250px]" />
        </div>
        
        {/* Main content skeleton */}
        <div className="px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Claim information card */}
              <Card>
                <CardHeader className="pb-2">
                  <EnhancedSkeleton animation="wave" className="h-5 w-[150px] mb-1" />
                  <EnhancedSkeleton animation="wave" className="h-4 w-[250px]" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <EnhancedSkeleton animation="wave" className="h-4 w-[130px] mb-4" />
                      <div className="space-y-4">
                        {Array(3).fill(0).map((_, i) => (
                          <div key={`left-${i}`} className="space-y-2">
                            <EnhancedSkeleton animation="wave" className="h-4 w-[100px] mb-1" />
                            <EnhancedSkeleton animation="wave" className="h-4 w-[150px]" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <EnhancedSkeleton animation="wave" className="h-4 w-[130px] mb-4" />
                      <div className="space-y-4">
                        {Array(3).fill(0).map((_, i) => (
                          <div key={`right-${i}`} className="space-y-2">
                            <EnhancedSkeleton animation="wave" className="h-4 w-[100px] mb-1" />
                            <EnhancedSkeleton animation="wave" className="h-4 w-[150px]" />
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
                      <EnhancedSkeleton animation="pulse" className="h-4 w-[80px]" />
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value="placeholder" className="mt-4">
                  <Card>
                    <CardHeader>
                      <EnhancedSkeleton animation="wave" className="h-5 w-[150px] mb-1" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array(5).fill(0).map((_, i) => (
                          <div key={`content-${i}`} className="grid grid-cols-4 p-3 border-b">
                            {Array(4).fill(0).map((_, j) => (
                              <div key={`cell-${i}-${j}`} className={j === 3 ? 'text-right' : ''}>
                                <EnhancedSkeleton 
                                  animation="wave"
                                  className={`h-4 w-[${j === 3 ? 80 : 120}px] ${j === 3 ? 'ml-auto' : ''}`}
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
              {/* Data Provider information card */}
              <Card>
                <CardHeader className="pb-2">
                  <EnhancedSkeleton animation="wave" className="h-5 w-[130px]" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    <EnhancedSkeleton animation="wave" className="h-10 w-10 rounded-full" />
                    <div>
                      <EnhancedSkeleton animation="wave" className="h-5 w-[150px]" />
                      <EnhancedSkeleton animation="wave" className="h-4 w-[180px] mt-1" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={`bank-${i}`} className="space-y-2">
                        <EnhancedSkeleton animation="wave" className="h-4 w-[80px]" />
                        <EnhancedSkeleton animation="wave" className="h-4 w-[150px]" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Data Recipient information card */}
              <Card>
                <CardHeader className="pb-2">
                  <EnhancedSkeleton animation="wave" className="h-5 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    <EnhancedSkeleton animation="wave" className="h-10 w-10 rounded-full" />
                    <div>
                      <EnhancedSkeleton animation="wave" className="h-5 w-[150px]" />
                      <EnhancedSkeleton animation="wave" className="h-4 w-[180px] mt-1" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={`fintech-${i}`} className="space-y-2">
                        <EnhancedSkeleton animation="wave" className="h-4 w-[80px]" />
                        <EnhancedSkeleton animation="wave" className="h-4 w-[150px]" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Actions card */}
              <Card>
                <CardHeader className="pb-2">
                  <EnhancedSkeleton animation="wave" className="h-5 w-[120px]" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array(4).fill(0).map((_, i) => (
                    <EnhancedSkeleton key={`action-${i}`} animation="wave" className="h-10 w-full" />
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