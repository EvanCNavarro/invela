import React from 'react'
import { UnifiedDropdown } from '@/components/ui/unified-dropdown'
import { Settings, FileText, Layout, Bell } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export const DropdownPlayground = () => {
  // State for regular dropdown
  const [selectedWidgets, setSelectedWidgets] = React.useState<string[]>(['announcements', 'quick_actions'])
  const [showIcons, setShowIcons] = React.useState(false)
  const [multiSelect, setMultiSelect] = React.useState(true)
  const [showTriggerIcon, setShowTriggerIcon] = React.useState(true)

  // State for action dropdown
  const [selectedAction, setSelectedAction] = React.useState<string | null>(null)

  const widgetItems = [
    { id: 'updates', label: 'Updates', leftIcon: showIcons ? Bell : undefined },
    { id: 'announcements', label: 'Announcements', leftIcon: showIcons ? FileText : undefined },
    { id: 'quick_actions', label: 'Quick Actions', leftIcon: showIcons ? Layout : undefined },
    { id: 'company_score', label: 'Company Score' },
    { id: 'network', label: 'Network Visualization' },
  ].map(item => ({
    ...item,
    selected: selectedWidgets.includes(item.id),
    onClick: () => {
      setSelectedWidgets(prev => 
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : multiSelect ? [...prev, item.id] : [item.id]
      )
    }
  }))

  const actionItems = [
    { id: 'edit', label: 'Edit' },
    { id: 'delete', label: 'Delete' },
    { id: 'archive', label: 'Archive' },
  ].map(item => ({
    ...item,
    selected: selectedAction === item.id,
    onClick: () => setSelectedAction(item.id)
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-icons" 
            checked={showIcons} 
            onCheckedChange={setShowIcons}
          />
          <Label htmlFor="show-icons">Show Item Icons</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="multi-select" 
            checked={multiSelect} 
            onCheckedChange={setMultiSelect}
          />
          <Label htmlFor="multi-select">Multi-select</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="trigger-icon" 
            checked={showTriggerIcon} 
            onCheckedChange={setShowTriggerIcon}
          />
          <Label htmlFor="trigger-icon">Show Trigger Icon</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <Card className="p-4 space-y-2">
          <h3 className="text-lg font-semibold">Regular Button Dropdown</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {multiSelect ? "Multi-select" : "Single-select"} dropdown with {showIcons ? "icons" : "no icons"}
          </p>
          <UnifiedDropdown
            trigger={{
              text: "Customize Dashboard",
              leftIcon: showTriggerIcon ? Settings : undefined,
              variant: 'default'
            }}
            title="Visible Widgets"
            items={widgetItems}
            multiSelect={multiSelect}
          />
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="text-lg font-semibold">Icon Button Dropdown</h3>
          <p className="text-sm text-muted-foreground mb-4">Actions menu with ellipsis trigger</p>
          <UnifiedDropdown
            trigger={{
              variant: 'icon'
            }}
            items={actionItems}
            align="end"
            multiSelect={false}
          />
        </Card>
      </div>
    </div>
  )
}