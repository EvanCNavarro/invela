import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedDropdownProps {
  trigger: {
    text: string
    leftIcon?: LucideIcon
    className?: string
    variant?: 'default' | 'outline' | 'ghost'
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
}

export const UnifiedDropdown = React.forwardRef<
  HTMLDivElement,
  UnifiedDropdownProps
>((props, ref) => {
  const { trigger, title, items, className, align = 'start' } = props
  const LeftIcon = trigger.leftIcon

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          "bg-background hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          trigger.className
        )}
      >
        {LeftIcon && <LeftIcon className="h-4 w-4" />}
        {trigger.text}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          align={align}
          className={cn(
            "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
        >
          {title && (
            <div className="px-2 py-1.5 text-sm font-semibold text-foreground/70">
              {title}
            </div>
          )}

          {items.map((item) => {
            const ItemIcon = item.leftIcon
            return (
              <DropdownMenuPrimitive.Item
                key={item.id}
                onClick={item.onClick}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  "transition-colors focus:bg-accent focus:text-accent-foreground",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                )}
              >
                {ItemIcon && (
                  <ItemIcon className="mr-2 h-4 w-4 text-foreground/50" />
                )}
                <span className="flex-grow">{item.label}</span>
                {item.selected && (
                  <Check className="ml-2 h-4 w-4 text-primary" />
                )}
              </DropdownMenuPrimitive.Item>
            )
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
})

UnifiedDropdown.displayName = "UnifiedDropdown"
