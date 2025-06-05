import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonTableProps {
  columns: number;
  rows?: number;
  cellWidths?: string[];
}

export function SkeletonTable({ columns, rows = 5, cellWidths }: SkeletonTableProps) {
  // Generate header columns
  const headerColumns = Array(columns).fill(0).map((_, i) => (
    <TableHead key={`header-${i}`} className={cellWidths?.[i] ? `w-[${cellWidths[i]}]` : ''}>
      <Skeleton className="h-4 w-full max-w-[100px]" />
    </TableHead>
  ));

  // Generate rows with cells
  const tableRows = Array(rows).fill(0).map((_, rowIndex) => (
    <TableRow key={`row-${rowIndex}`}>
      {Array(columns).fill(0).map((_, colIndex) => (
        <TableCell key={`cell-${rowIndex}-${colIndex}`}>
          <Skeleton className={`h-4 ${colIndex === 0 ? 'w-[80px]' : 'w-full max-w-[120px]'}`} />
        </TableCell>
      ))}
    </TableRow>
  ));

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {headerColumns}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Predefined skeleton loader for claims tables
 */
export function ClaimsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-[80px]" />
      </div>
      <SkeletonTable 
        columns={7} 
        rows={5}
        cellWidths={['120px', '150px', '150px', '120px', '120px', '150px', '80px']}
      />
    </div>
  );
}

/**
 * Card skeleton with optional title skeleton
 */
export function CardSkeleton({ hasTitle = true, rows = 3 }: { hasTitle?: boolean, rows?: number }) {
  return (
    <div className="border rounded-lg p-6 space-y-6">
      {hasTitle && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
      )}
      
      <div className="space-y-4">
        {Array(rows).fill(0).map((_, i) => (
          <div key={`row-${i}`} className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Two column information card skeleton
 */
export function TwoColumnCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-[150px]" />
          
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={`left-${i}`} className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-4 w-[150px]" />
          
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={`right-${i}`} className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile card skeleton with avatar and basic info
 */
export function ProfileCardSkeleton() {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
      
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={`field-${i}`} className="space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[180px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tab content skeleton with skeleton tabs
 */
export function TabsContentSkeleton({ tabCount = 3 }: { tabCount?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b pb-0.5">
        {Array(tabCount).fill(0).map((_, i) => (
          <Skeleton key={`tab-${i}`} className="h-10 w-[120px]" />
        ))}
      </div>
      
      <CardSkeleton rows={5} />
    </div>
  );
}