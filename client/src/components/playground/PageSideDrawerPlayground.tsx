import * as React from "react"
import { Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

interface PageSideDrawerProps {
  title?: string
  titleIcon?: React.ReactNode
  children?: React.ReactNode
  isClosable?: boolean
  defaultOpen?: boolean
  width?: string
}

const PageSideDrawer: React.FC<PageSideDrawerProps> = ({
  title = "Info Drawer",
  titleIcon,
  children,
  isClosable = true,
  defaultOpen = true,
  width = "23.75rem", // 380px converted to rem
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div
      className={`fixed right-0 top-0 h-full transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ width }}
    >
      <div className="h-full bg-background border-l">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {titleIcon}
            <h3 className="font-semibold">{title}</h3>
          </div>
          {isClosable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? "×" : "→"}
            </Button>
          )}
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-4rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}

const PageSideDrawerPlayground = () => {
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
        <div className={`transition-all duration-300 ${defaultOpen ? 'pr-[23.75rem]' : 'pr-0'}`}>
          <div className="p-4">
            <h4 className="text-lg font-medium mb-2">Main Content Area</h4>
            <p className="text-muted-foreground">
              This area demonstrates how content responds to the drawer state.
              The drawer can be toggled using the close button.
            </p>
          </div>
        </div>

        <PageSideDrawer
          title="Extra Info Drawer"
          titleIcon={showIcon ? <Info className="h-5 w-5" /> : undefined}
          isClosable={isClosable}
          defaultOpen={defaultOpen}
        >
          <div className="space-y-4">
            <h4 className="font-medium">Sample Drawer Content</h4>
            <p className="text-sm text-muted-foreground">
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

export default PageSideDrawerPlayground