/**
 * BlockCompanyButton Component
 * 
 * Provides manual company blocking/unblocking functionality with confirmation dialog.
 * Integrates with the existing backend API for risk status management.
 */

import { useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BlockCompanyButtonProps {
  companyId?: number;
  companyName?: string;
  currentStatus?: 'Blocked' | 'Approaching Block' | 'Monitoring' | 'Stable';
  className?: string;
}

export const BlockCompanyButton: React.FC<BlockCompanyButtonProps> = ({
  companyId,
  companyName,
  currentStatus = 'Stable',
  className
}) => {
  // Immediate execution debug log
  console.log('[BlockCompanyButton] Component function executing with props:', {
    companyId,
    companyName,
    currentStatus,
    timestamp: new Date().toISOString()
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Block/unblock company mutation - must be declared before any conditional returns
  const blockMutation = useMutation({
    mutationFn: async (action: 'block' | 'unblock') => {
      if (!companyId) throw new Error('Invalid company ID');
      return apiRequest(`/api/companies/${companyId}/block`, {
        method: 'PATCH',
        body: { 
          action,
          reason: `Manual ${action} from company profile`
        }
      });
    },
    onSuccess: (data, action) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/profile`] });
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/risk-unified`] });
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/risk-status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk/unified'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies-with-risk'] });
      
      toast({
        title: action === 'block' ? 'Company Blocked' : 'Company Unblocked',
        description: `${companyName} has been ${action}ed successfully. Risk status updated across all systems.`,
        variant: action === 'block' ? 'destructive' : 'default'
      });
      
      console.log(`[BlockCompanyButton] Successfully ${action}ed company:`, data);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error('[BlockCompanyButton] Error blocking/unblocking company:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company status. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Early return guard for invalid props - after all hooks are declared
  if (!companyId || !companyName) {
    console.log('[BlockCompanyButton] Invalid props provided, skipping render:', {
      hasCompanyId: !!companyId,
      hasCompanyName: !!companyName,
      companyId,
      companyName
    });
    return null;
  }

  const isBlocked = currentStatus === 'Blocked';
  const action = isBlocked ? 'unblock' : 'block';
  const actionLabel = isBlocked ? 'Unblock Company' : 'Block Company';

  // Comprehensive debug logging for monitoring
  console.log(`[BlockCompanyButton] Rendering for company ${companyId} (${companyName}) with status: ${currentStatus}`, {
    companyId,
    companyName,
    currentStatus,
    isBlocked,
    action,
    actionLabel,
    timestamp: new Date().toISOString()
  });

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={isBlocked ? "default" : "destructive"}
          size="sm"
          className={`flex items-center gap-2 ${className || ''}`}
          disabled={blockMutation.isPending}
        >
          {isBlocked ? (
            <Shield className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {blockMutation.isPending ? 'Processing...' : actionLabel}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? 'Unblock Company?' : 'Block Company?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              <>
                Are you sure you want to unblock <strong>{companyName}</strong>? 
                This will restore normal data sharing and remove all blocking restrictions.
              </>
            ) : (
              <>
                Are you sure you want to block <strong>{companyName}</strong>? 
                This will immediately stop all data sharing and mark the company as high-risk across the platform.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => blockMutation.mutate(action)}
            className={isBlocked ? '' : 'bg-red-600 hover:bg-red-700'}
            disabled={blockMutation.isPending}
          >
            {blockMutation.isPending ? 'Processing...' : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};