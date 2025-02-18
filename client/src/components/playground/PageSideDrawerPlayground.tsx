import * as React from "react"
import { Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export interface PageSideDrawerProps {
  title?: string
  titleIcon?: React.ReactNode
  children?: React.ReactNode
  isClosable?: boolean
  defaultOpen?: boolean
  width?: string
  onOpenChange?: (open: boolean) => void
}

export const PageSideDrawer: React.FC<PageSideDrawerProps> = ({
  title = "Info Drawer",
  titleIcon,
  children,
  isClosable = true,
  defaultOpen = true,
  width = "25.75rem",
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  React.useEffect(() => {
    setIsOpen(defaultOpen)
  }, [defaultOpen])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  if (!isOpen) return null

  return (
    <div className="fixed top-[57px] right-0 bottom-0 w-[25.75rem] border-l bg-background">
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
              {isOpen ? "×" : "→"}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PageSideDrawerPlayground() {
  const [isClosable, setIsClosable] = React.useState(true)
  const [showIcon, setShowIcon] = React.useState(true)
  const [defaultOpen, setDefaultOpen] = React.useState(true)

  return (
    <div className="space-y-8">
      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="closable"
              checked={isClosable}
              onCheckedChange={setIsClosable}
            />
            <Label htmlFor="closable">Closable</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-icon"
              checked={showIcon}
              onCheckedChange={setShowIcon}
            />
            <Label htmlFor="show-icon">Show Title Icon</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="default-open"
              checked={defaultOpen}
              onCheckedChange={setDefaultOpen}
            />
            <Label htmlFor="default-open">Default Open</Label>
          </div>
        </div>
      </Card>

      <div className="relative min-h-[400px] border rounded-lg">
        <div className={`transition-all duration-300`}>
          <div className="p-4 ml-24"> {/* Added margin to compensate for fixed drawer */}
            <h4 className="text-lg font-medium mb-2">Main Content Area</h4>
            <p className="text-muted-foreground">
              This area demonstrates how content responds to the drawer state.
              The drawer can be toggled using the close button.
            </p>
          </div>
        </div>

        <PageSideDrawer
          title="Sample Drawer Content"
          titleIcon={showIcon ? <Info className="h-5 w-5" /> : undefined}
          isClosable={isClosable}
          defaultOpen={defaultOpen}
          onOpenChange={setDefaultOpen}
        >
          <div className="space-y-4">
            <h4 className="font-medium">Configuration Options</h4>
            <p className="text-muted-foreground">
              This drawer can contain any content, including other components,
              forms, or informational displays.
            </p>
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Features</h5>
              <ul className="text-sm space-y-1">
                <li>• Responsive layout</li>
                <li>• Customizable width</li>
                <li>• Optional close button</li>
                <li>• Optional header icon</li>
              </ul>
            </div>
          </div>
        </PageSideDrawer>
      </div>
    </div>
  )
}