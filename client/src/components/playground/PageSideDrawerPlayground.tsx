import * as React from "react"
import { Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PageSideDrawer, PageTemplate } from "@/components/ui/page-side-drawer"

export default function PageSideDrawerPlayground() {
  const [showIcon, setShowIcon] = React.useState(true)
  const [drawerOpen] = React.useState(false) // Not open by default for playground

  const drawer = (
    <PageSideDrawer
      title="Sample Drawer Content"
      titleIcon={showIcon ? <Info className="h-5 w-5" /> : undefined}
      isClosable={false}
      defaultOpen={true}
    >
      <div className="space-y-4">
        <h4 className="font-medium">Configuration Options</h4>
        <p className="text-muted-foreground">
          This drawer demonstrates how the drawer behaves when integrated with PageTemplate.
        </p>
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Features</h5>
          <ul className="text-sm space-y-1">
            <li>• Responsive layout</li>
            <li>• Customizable width</li>
            <li>• Optional header icon</li>
          </ul>
        </div>
      </div>
    </PageSideDrawer>
  )

  return (
    <div className="space-y-8">
      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-icon"
              checked={showIcon}
              onCheckedChange={setShowIcon}
            />
            <Label htmlFor="show-icon">Show Title Icon</Label>
          </div>
        </div>
      </Card>

      <div className="relative min-h-[400px] border rounded-lg overflow-hidden">
        <PageTemplate
          drawer={drawer}
          drawerOpen={false}
        >
          <div className="p-4">
            <h4 className="text-lg font-medium mb-2">Main Content Area</h4>
            <p className="text-muted-foreground">
              This area demonstrates how content responds to the drawer state.
              The drawer in this playground starts closed.
            </p>
          </div>
        </PageTemplate>
      </div>
    </div>
  )
}