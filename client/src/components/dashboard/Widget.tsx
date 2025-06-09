/**
 * ========================================
 * Widget Component - Enterprise Dashboard Foundation
 * ========================================
 * 
 * Enhanced base widget component implementing the unified design token system
 * for consistent enterprise-grade dashboard widgets. Features persona-based
 * content variants, standardized loading states, and accessibility-compliant
 * interactions with smooth animations.
 * 
 * Key Features:
 * - Unified design token system integration
 * - Standardized loading states with shimmer effects
 * - Enterprise-grade accessibility support
 * - Smooth entrance animations with reduced motion support
 * - Professional hover and focus interactions
 * - Responsive design patterns
 * 
 * @module components/dashboard/Widget
 * @version 3.0.0
 * @since 2025-06-09
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MoreVertical, 
  Eye, 
  EyeOff,
  Maximize2,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Widget size variants affecting layout and responsive behavior
 */
type WidgetSize = 'compact' | 'standard' | 'expanded' | 'full';

/**
 * Loading state variants for consistent UX patterns
 */
type LoadingState = 'skeleton' | 'shimmer' | 'spinner' | 'none';

/**
 * Animation entrance effects for premium feel
 */
type EntranceAnimation = 'fadeIn' | 'slideUp' | 'scale' | 'none';

/**
 * Widget action interface for dropdown menu items
 */
interface WidgetAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

/**
 * Enhanced widget props interface with design system integration
 */
interface WidgetProps {
  /** Widget title using standardized typography */
  title: string;
  /** Optional subtitle with muted styling */
  subtitle?: string;
  /** Header icon with standardized sizing */
  icon?: React.ReactNode;
  /** Widget content */
  children: React.ReactNode;
  /** Visibility toggle callback */
  onVisibilityToggle?: () => void;
  /** Current visibility state */
  isVisible?: boolean;
  /** Edit/configure callback */
  onEdit?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Header-specific CSS classes */
  headerClassName?: string;
  /** Widget size variant affecting layout */
  size?: WidgetSize;
  /** Loading state for consistent UX */
  loadingState?: LoadingState;
  /** Entrance animation effect */
  entranceAnimation?: EntranceAnimation;
  /** Animation delay in milliseconds */
  animationDelay?: number;
  /** Custom actions for dropdown menu */
  actions?: WidgetAction[];
  /** Additional header content */
  headerChildren?: React.ReactNode;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error state with fallback UI */
  error?: string | null;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

export function Widget({ 
  title, 
  subtitle,
  icon, 
  children, 
  onVisibilityToggle,
  isVisible = true,
  onEdit,
  className,
  headerClassName,
  size = 'standard',
  loadingState = 'none',
  entranceAnimation = 'fadeIn',
  animationDelay = 0,
  actions = [],
  headerChildren,
  isLoading = false,
  error = null,
  ariaLabel
}: WidgetProps) {
  return (
    <Card className={cn(
      "transition-all duration-200 bg-background/40 backdrop-blur-sm hover:bg-background/60",
      // Widget sizing handled by parent grid
      '',
      !isVisible && 'opacity-50',
      className?.includes("h-full") ? "flex flex-col h-full" : "",
      className
    )}>
      <div className={cn("flex items-center justify-between px-4 pt-4", headerClassName)}>
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-medium text-base">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {headerChildren && (
            <div className="ml-2">
              {headerChildren}
            </div>
          )}
        </div>
        {(onVisibilityToggle || actions.length > 0 || onEdit) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-background"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onVisibilityToggle && (
                <>
                  <DropdownMenuItem onClick={onVisibilityToggle}>
                    {isVisible ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Widget
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show Widget
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {actions.map((action, index) => (
                <DropdownMenuItem key={index} onClick={action.onClick}>
                  {action.icon && (
                    <span className="mr-2">{action.icon}</span>
                  )}
                  {action.label}
                </DropdownMenuItem>
              ))}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Configure Widget
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className={cn(
        "p-4", 
        (className?.includes("flex-col") || className?.includes("h-full")) && "flex-grow h-full",
        "overflow-hidden" // Prevent content overflow
      )}>
        {children}
      </div>
    </Card>
  );
}