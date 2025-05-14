import React, { forwardRef, memo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { logger } from '@/lib/logger';

// Logger for tracking dialog component behavior
const dialogLogger = logger.modal;

/**
 * Props for the MemoizedDialog component
 */
interface MemoizedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  preventAutoFocus?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * A memoized dialog component that prevents unnecessary re-renders
 * and provides better focus management.
 */
const MemoizedDialogComponent = forwardRef<HTMLDivElement, MemoizedDialogProps>(
  ({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
    showCloseButton = false,
    preventAutoFocus = true,
    width = 'md'
  }, ref) => {
    dialogLogger.debug(`Rendering MemoizedDialog: open=${open}, title=${title}`);

    // Prevent auto-focus on open to avoid focus issues with Select components
    const handleOpenAutoFocus = useCallback((event: Event) => {
      if (preventAutoFocus) {
        dialogLogger.debug('Preventing dialog auto-focus');
        event.preventDefault();
      }
    }, [preventAutoFocus]);

    // Track dialog state changes
    const handleOpenChange = useCallback((newOpen: boolean) => {
      dialogLogger.debug(`Dialog open state changing: ${open} → ${newOpen}`);
      onOpenChange(newOpen);
    }, [onOpenChange, open]);

    // Determine dialog width class
    const widthClass = {
      sm: 'sm:max-w-sm',
      md: 'sm:max-w-md',
      lg: 'sm:max-w-lg',
      xl: 'sm:max-w-xl',
      full: 'sm:max-w-[calc(100vw-2rem)]'
    }[width];

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          ref={ref}
          className={`${widthClass} ${className || ''}`}
          onOpenAutoFocus={handleOpenAutoFocus}
          onInteractOutside={(e) => {
            // Prevent closing when interacting with select dropdown
            if ((e.target as HTMLElement).closest('[role="listbox"]')) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Allow escape key to close dialog except during dropdown interactions
            if (document.querySelector('[role="listbox"]')) {
              e.preventDefault();
            }
          }}
        >
          {(title || description) && (
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
        </DialogContent>
      </Dialog>
    );
  }
);

MemoizedDialogComponent.displayName = 'MemoizedDialog';

/**
 * Export a memoized version of the dialog component to prevent
 * unnecessary re-renders when parent components update
 */
export const MemoizedDialog = memo(MemoizedDialogComponent);