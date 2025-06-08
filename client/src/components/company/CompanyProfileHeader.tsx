/**
 * CompanyProfileHeader Component
 * 
 * Displays breadcrumb navigation and company actions for profile pages.
 * Includes "Block Company" functionality with confirmation dialog.
 */

import React, { useState } from 'react';
import { ChevronRight, Shield, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';
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

interface CompanyProfileHeaderProps {
  companyId: number;
  companyName: string;
  currentStatus?: 'Blocked' | 'Approaching Block' | 'Monitoring' | 'Stable';
  className?: string;
}

export const CompanyProfileHeader: React.FC<CompanyProfileHeaderProps> = ({
  companyId,
  companyName,
  currentStatus = 'Stable',
  className = ''
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Block/unblock company mutation
  const blockMutation = useMutation({
    mutationFn: async (action: 'block' | 'unblock') => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/risk/unified'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies-with-risk'] });
      
      toast({
        title: action === 'block' ? 'Company Blocked' : 'Company Unblocked',
        description: `${companyName} has been ${action}ed successfully. Risk status updated across all systems.`,
        variant: action === 'block' ? 'destructive' : 'default'
      });
      
      console.log(`[CompanyProfileHeader] Successfully ${action}ed company:`, data);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error('[CompanyProfileHeader] Error blocking/unblocking company:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company status. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const isBlocked = currentStatus === 'Blocked';
  const action = isBlocked ? 'unblock' : 'block';
  const actionLabel = isBlocked ? 'Unblock Company' : 'Block Company';

  return (
    <div className={`flex items-center justify-between py-4 border-b bg-white ${className}`}>
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        <Link href="/network" className="hover:text-gray-900 transition-colors">
          Network
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/network" className="hover:text-gray-900 transition-colors">
          Data Recipients
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{companyName}</span>
      </nav>

      {/* Action Button */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={isBlocked ? "default" : "destructive"}
            size="sm"
            className="flex items-center gap-2"
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
            <AlertDialogTitle className="flex items-center gap-2">
              {isBlocked ? (
                <Shield className="h-5 w-5 text-blue-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {actionLabel}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked ? (
                <>
                  This will restore <strong>{companyName}</strong> to its calculated risk status based on assessment data. 
                  The company will no longer be manually blocked and risk calculations will resume normally.
                </>
              ) : (
                <>
                  This will immediately block <strong>{companyName}</strong> regardless of their calculated risk score. 
                  The company will be marked as blocked across all dashboards, insights, and risk monitoring systems.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockMutation.mutate(action)}
              className={isBlocked ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}
              disabled={blockMutation.isPending}
            >
              {blockMutation.isPending ? 'Processing...' : `Confirm ${actionLabel}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyProfileHeader;