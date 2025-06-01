import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileQuestion 
} from 'lucide-react';
import { format } from 'date-fns';

type ClaimStatus = 'in_review' | 'processing' | 'pending_info' | 'under_review' | 'escalated' | 'approved' | 'partially_approved' | 'denied';

interface Claim {
  id: number;
  claim_id: string;
  bank_id: string;
  bank_name: string;
  fintech_name: string;
  account_number?: string;
  claim_type: string;
  claim_date: string;
  claim_amount: number;
  status: ClaimStatus;
  policy_number?: string;
  is_disputed: boolean;
  is_resolved: boolean;
  dispute?: any;
  resolution?: any;
}

interface ClaimsTableProps {
  claims: Claim[];
  type: 'active' | 'disputed' | 'resolved';
  onRefresh: () => void;
}

export default function ClaimsTable({ claims, type, onRefresh }: ClaimsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [, navigate] = useLocation();

  const filteredClaims = claims.filter(claim => {
    const searchLower = searchTerm.toLowerCase();
    return (
      claim.claim_id.toLowerCase().includes(searchLower) ||
      claim.bank_name.toLowerCase().includes(searchLower) ||
      claim.fintech_name.toLowerCase().includes(searchLower) ||
      (claim.account_number && claim.account_number.toLowerCase().includes(searchLower)) ||
      (claim.policy_number && claim.policy_number.toLowerCase().includes(searchLower))
    );
  });

  /**
   * Navigate to the claim detail page
   * This function logs navigation attempts and details for debugging purposes
   */
  const handleViewClaim = (claim: Claim) => {
    console.log('[ClaimsTable] Attempting to navigate to claim details:', claim);
    
    if (!claim || !claim.id) {
      console.error('[ClaimsTable] Cannot navigate - invalid claim or missing ID');
      return;
    }
    
    const detailPath = `/claims/${claim.id}`;
    console.log('[ClaimsTable] Navigating to path:', detailPath);
    
    // Use the numeric ID for navigation as it's expected by the route parameter
    navigate(detailPath);
  };

  const handleDisputeClaim = (claim: Claim) => {
    // Use the numeric ID for navigation as it's expected by the route parameter
    navigate(`/claims/${claim.id}/dispute`);
  };

  const handleResolveClaim = (claim: Claim) => {
    // Use the numeric ID for navigation as it's expected by the route parameter
    navigate(`/claims/${claim.id}/resolve`);
  };

  /**
   * Format amount as a flat number without currency symbol
   * Follows the standardized formatting across the application
   */
  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('en-US');
  };

  /**
   * Format date as MMM DD, YYYY
   * Standardized date formatting for consistent display
   */
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'in_review':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">In Review</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Processing</Badge>;
      case 'pending_info':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending Info</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Under Review</Badge>;
      case 'escalated':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Escalated</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Approved</Badge>;
      case 'partially_approved':
        return <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">Partially Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Denied</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Unknown</Badge>;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'disputed':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <FileQuestion className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
      
      {filteredClaims.length === 0 ? (
        <div className="py-12 flex items-center justify-center border rounded-lg bg-muted/10">
          <div className="flex flex-col items-center text-center max-w-md">
            {getTypeIcon()}
            <h3 className="mt-4 text-lg font-semibold">No {type} claims found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {type === 'active' && "There are no active claims at the moment. Create a new claim to get started."}
              {type === 'disputed' && "There are no disputed claims at the moment."}
              {type === 'resolved' && "There are no resolved claims at the moment."}
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] pl-4">Claim ID</TableHead>
                <TableHead className="w-[150px]">Data Provider</TableHead>
                <TableHead className="w-[150px]">Data Recipient</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[120px] text-right">Amount</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[80px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => (
                <TableRow 
                  key={claim.id} 
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={(e) => {
                    // Prevent clicking on action buttons from triggering row click
                    if ((e.target as HTMLElement).closest('.action-cell')) return;
                    handleViewClaim(claim);
                  }}
                >
                  <TableCell className="font-medium pl-4">{claim.claim_id}</TableCell>
                  <TableCell>{claim.bank_name}</TableCell>
                  <TableCell>{claim.fintech_name}</TableCell>
                  <TableCell>{formatDate(claim.claim_date)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(claim.claim_amount)}</TableCell>
                  <TableCell>{getStatusBadge(claim.status)}</TableCell>
                  <TableCell className="text-right pr-4 action-cell">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewClaim(claim)}>
                          View details
                        </DropdownMenuItem>
                        
                        {type === 'active' && (
                          <DropdownMenuItem onClick={() => handleDisputeClaim(claim)}>
                            Dispute claim
                          </DropdownMenuItem>
                        )}
                        
                        {(type === 'active' || type === 'disputed') && (
                          <DropdownMenuItem onClick={() => handleResolveClaim(claim)}>
                            Resolve claim
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
