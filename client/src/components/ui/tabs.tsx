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
      "inline-flex h-10 items-center justify-start bg-transparent border-b-3 border-gray-200",
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
        "inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-1.5 text-sm font-medium ring-offset-background transition-all border-b-3 border-transparent relative min-w-[100px] -mb-[3px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        locked ? "bg-muted text-muted-foreground cursor-not-allowed" : 
          "text-gray-600 hover:text-gray-900 hover:border-gray-300",
        "data-[state=active]:bg-blue-50/50 data-[state=active]:text-gray-900 data-[state=active]:border-blue-500 data-[state=active]:font-semibold mr-8",
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
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }