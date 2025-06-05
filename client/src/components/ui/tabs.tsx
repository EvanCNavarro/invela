/**
 * ========================================
 * Tabs Component System - Tabbed Navigation Interface
 * ========================================
 * 
 * Professional tabs component system built with Radix UI primitives providing
 * accessible tabbed navigation with enterprise features including locked tabs,
 * icons, and professional styling consistent with the design system.
 * 
 * Key Features:
 * - Accessible tab navigation with keyboard support
 * - Locked tab states for restricted content
 * - Icon integration for enhanced visual hierarchy
 * - Professional styling with enterprise design tokens
 * - Type-safe component composition
 * 
 * Tab Components:
 * - Tabs: Root tabs container with state management
 * - TabsList: Tab navigation list with professional styling
 * - TabsTrigger: Individual tab triggers with lock support
 * - TabsContent: Tab content panels with transitions
 * 
 * @module components/ui/tabs
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-start border-b-[3px] border-gray-200 w-full",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  locked?: boolean
  icon?: React.ElementType
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, locked, icon: Icon, children, disabled, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      disabled={locked || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-1.5 text-sm font-medium ring-offset-background transition-all border-b-[3px] border-transparent relative min-w-[120px] -mb-[3px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        locked ? "bg-muted text-muted-foreground cursor-not-allowed" : 
          "text-gray-600 hover:text-gray-900 hover:border-gray-300",
        "data-[state=active]:bg-[#EEF4FF] data-[state=active]:text-gray-900 data-[state=active]:border-blue-500 data-[state=active]:font-semibold mr-8",
        className
      )}
      {...props}
    >
      {locked ? <Lock className="h-3.5 w-3.5" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }