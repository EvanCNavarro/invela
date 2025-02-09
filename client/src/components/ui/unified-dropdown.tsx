import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, MoreHorizontal, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedDropdownProps {
  trigger: {
    text?: string
    leftIcon?: LucideIcon
    className?: string
    variant?: 'default' | 'icon'
    dynamicText?: boolean
  }
  title?: string
  items: {
    id: string | number
    label: string
    selected?: boolean
    onClick?: () => void
    leftIcon?: LucideIcon
  }[]
  className?: string
  align?: 'start' | 'center' | 'end'
  multiSelect?: boolean
  showCheckmarks?: boolean
}

export const UnifiedDropdown = React.forwardRef<
  HTMLDivElement,
  UnifiedDropdownProps
>((props, ref) => {
  const { 
    trigger, 
    title, 
    items, 
    className, 
    align = 'start', 
    multiSelect = true,
    showCheckmarks = true
  } = props
  const [open, setOpen] = React.useState(false)
  const LeftIcon = trigger.leftIcon
  const isIconOnly = trigger.variant === 'icon'

  // Handle menu item selection
  const handleSelect = (onClick?: () => void) => {
    if (onClick) {
      onClick()
      // Only close if it's single select or icon variant
      if (!multiSelect || isIconOnly) {
        setOpen(false)
      }
    }
  }

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if:
    // 1. It's not a multi-select dropdown
    // 2. User is actually trying to close the menu (newOpen is false)
    if (!multiSelect || newOpen) {
      setOpen(newOpen)
    }
  }

  // Get dynamic button text and icon for single-select dropdowns
  const buttonContent = React.useMemo(() => {
    if (!trigger.dynamicText || multiSelect) {
      return { text: trigger.text, icon: trigger.leftIcon }
    }
    const selectedItem = items.find(item => item.selected)
    return { 
      text: selectedItem?.label || trigger.text,
      icon: selectedItem?.leftIcon || trigger.leftIcon
    }
  }, [trigger.dynamicText, trigger.text, trigger.leftIcon, items, multiSelect])

  // Check if any items have icons to enforce consistency
  const hasIcons = items.some(item => item.leftIcon)
  if (hasIcons && !items.every(item => item.leftIcon)) {
    console.warn('All items must have icons if any item has an icon')
  }

  // Calculate max content width
  const maxLabelLength = Math.max(
    ...[buttonContent.text, ...items.map(item => item.label)]
      .filter(Boolean)
      .map(text => text?.length || 0)
  )
  const minWidth = Math.max(200, maxLabelLength * 8) // 8px per character as rough estimate

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuPrimitive.Trigger
        className={cn(
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isIconOnly 
            ? "h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent"
            : cn(
                "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium",
                "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                "whitespace-nowrap",
                trigger.className
              )
        )}
        style={{ minWidth: isIconOnly ? undefined : minWidth }}
      >
        {isIconOnly ? (
          <MoreHorizontal className="h-4 w-4" />
        ) : (
          <>
            <span className="flex items-center gap-2">
              {buttonContent.icon && <buttonContent.icon className="h-4 w-4" />}
              {buttonContent.text}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              open ? "rotate-180" : ""
            )} />
          </>
        )}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          align={align}
          style={{ minWidth: isIconOnly ? 200 : minWidth }}
          className={cn(
            "z-50 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
        >
          {title && (
            <div className="px-2 py-1.5 text-sm font-semibold">
              {title}
            </div>
          )}

          {items.map((item) => {
            const ItemIcon = item.leftIcon
            return (
              <DropdownMenuPrimitive.Item
                key={item.id}
                onClick={() => handleSelect(item.onClick)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  "transition-colors focus:bg-accent focus:text-accent-foreground",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                )}
              >
                <div className="flex items-center w-full">
                  {showCheckmarks && (
                    <div className="w-6 flex justify-center">
                      {item.selected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )}
                  {ItemIcon && (
                    <ItemIcon className="mr-2 h-4 w-4 text-foreground/50" />
                  )}
                  <span className="flex-grow whitespace-nowrap">{item.label}</span>
                </div>
              </DropdownMenuPrimitive.Item>
            )
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
})

UnifiedDropdown.displayName = "UnifiedDropdown"