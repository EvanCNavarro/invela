import * as React from "react"
import { Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { PageSideDrawer, PageTemplate } from "@/components/ui/page-side-drawer"

export default function PageSideDrawerPlayground() {
  const [showIcon, setShowIcon] = React.useState(true)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const handleDrawerChange = (open: boolean) => {
    setDrawerOpen(open)
  }

  const drawer = (
    <PageSideDrawer
      title="Sample Drawer Content"
      titleIcon={showIcon ? <Info className="h-5 w-5" /> : undefined}
      isClosable={true}
      defaultOpen={drawerOpen}
      onOpenChange={handleDrawerChange}
    >
      <div className="space-y-4">
        <h4 className="font-medium">Configuration Options</h4>
        <p className="text-muted-foreground">
          This drawer demonstrates how the drawer behaves when integrated with PageTemplate.
          Use the controls to toggle the drawer and customize its appearance.
        </p>
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Features</h5>
          <ul className="text-sm space-y-1">
            <li>• Closeable drawer</li>
            <li>• Optional header icon</li>
            <li>• Responsive layout</li>
          </ul>
        </div>
      </div>
    </PageSideDrawer>
  )

  return (
    <div className="space-y-8">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-icon"
              checked={showIcon}
              onCheckedChange={setShowIcon}
            />
            <Label htmlFor="show-icon">Show Title Icon</Label>
          </div>
          <Button 
            variant="outline" 
            onClick={() => handleDrawerChange(!drawerOpen)}
          >
            {drawerOpen ? "Hide Drawer" : "Show Drawer"}
          </Button>
        </div>
      </Card>

      <div className="relative min-h-[400px] border rounded-lg overflow-hidden">
        <PageTemplate
          drawer={drawerOpen ? drawer : null}
          drawerOpen={drawerOpen}
          onDrawerOpenChange={handleDrawerChange}
        >
          <div className="p-4">
            <h4 className="text-lg font-medium mb-2">Main Content Area</h4>
            <p className="text-muted-foreground">
              This area demonstrates how content responds to the drawer state.
              The drawer is currently {drawerOpen ? "open" : "closed"}.
            </p>
          </div>
        </PageTemplate>
      </div>
    </div>
  )
}