import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageSideDrawerProps {
  title?: string
  titleIcon?: React.ReactNode
  children?: React.ReactNode
  isClosable?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PageSideDrawer({
  title = "Info Drawer",
  titleIcon,
  children,
  isClosable = true,
  defaultOpen = false,
  onOpenChange
}: PageSideDrawerProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  // Use a ref to track mounted state
  const isMounted = React.useRef(false)

  React.useEffect(() => {
    isMounted.current = true
    setIsOpen(defaultOpen)
    return () => {
      isMounted.current = false
      // Only call onOpenChange if the component is unmounting and was open
      if (isOpen) {
        onOpenChange?.(false)
      }
    }
  }, [defaultOpen, onOpenChange, isOpen])

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isMounted.current) return
    if (!isClosable && defaultOpen) return // Prevent closing if not closable and default open
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [isClosable, defaultOpen, onOpenChange])

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-[57px] bottom-0 w-[25.75rem] transition-all duration-300">
      <div className="h-[calc(100%-2rem)] rounded-lg border bg-background shadow-sm overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              {titleIcon}
              <h3 className="font-semibold">{title}</h3>
            </div>
            {isClosable && (
              <button
                className="p-2 hover:bg-muted rounded-md"
                onClick={() => handleOpenChange(!isOpen)}
              >
                ×
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export interface PageTemplateProps {
  children: React.ReactNode
  drawer?: React.ReactNode
  drawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
}

export function PageTemplate({
  children,
  drawer,
  drawerOpen = false,
  onDrawerOpenChange
}: PageTemplateProps) {
  return (
    <div className="flex-1 flex overflow-x-hidden">
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300 p-6",
        drawerOpen ? "mr-[25.75rem]" : ""
      )}>
        {children}
      </div>
      {drawer}
    </div>
  )
}