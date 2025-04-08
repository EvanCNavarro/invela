import React from 'react'
import { UnifiedDropdown } from '@/components/ui/unified-dropdown'
import { Settings, FileText, Layout, Bell, Edit, Trash2, Archive, Download, Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useUnifiedToast } from '@/hooks/use-unified-toast'

const DropdownPlayground = () => {
  // State for regular dropdown
  const [selectedWidgets, setSelectedWidgets] = React.useState<string[]>(['announcements', 'quick_actions'])
  const [showIcons, setShowIcons] = React.useState(false)
  const [multiSelect, setMultiSelect] = React.useState(true)
  const [showTriggerIcon, setShowTriggerIcon] = React.useState(true)
  const [dynamicText, setDynamicText] = React.useState(false)

  // State for action dropdown
  const [selectedAction, setSelectedAction] = React.useState<string | null>(null)
  const unifiedToast = useUnifiedToast()

  const widgetItems = [
    { id: 'updates', label: 'Updates', leftIcon: showIcons ? Bell : undefined },
    { id: 'announcements', label: 'Announcements', leftIcon: showIcons ? FileText : undefined },
    { id: 'quick_actions', label: 'Quick Actions', leftIcon: showIcons ? Layout : undefined },
    { id: 'company_score', label: 'Company Score', leftIcon: showIcons ? Settings : undefined },
    { id: 'network', label: 'Network Visualization', leftIcon: showIcons ? Layout : undefined },
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
    { 
      id: 'view', 
      label: 'View Details', 
      leftIcon: Eye,
      onClick: () => {
        unifiedToast.info("View Details", "Opening details modal...")
      }
    },
    { 
      id: 'edit', 
      label: 'Edit', 
      leftIcon: Edit,
      onClick: () => {
        unifiedToast.info("Edit", "Opening edit modal...")
      }
    },
    { 
      id: 'download', 
      label: 'Download', 
      leftIcon: Download,
      onClick: () => {
        unifiedToast.info("Download", "Starting download...")
      }
    },
    { 
      id: 'delete', 
      label: 'Delete', 
      leftIcon: Trash2,
      onClick: () => {
        unifiedToast.warning("Delete", "Opening delete confirmation modal...")
      }
    },
    { 
      id: 'archive', 
      label: 'Archive', 
      leftIcon: Archive,
      onClick: () => {
        unifiedToast.info("Archive", "Opening archive confirmation modal...")
      }
    },
  ]

  return (
    <div className="space-y-6">
      {/* Controls for regular button dropdown only */}
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
        <div className="flex items-center space-x-2">
          <Switch 
            id="dynamic-text" 
            checked={dynamicText} 
            onCheckedChange={setDynamicText}
            disabled={multiSelect}
          />
          <Label htmlFor="dynamic-text">Dynamic Button Text</Label>
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
              variant: 'default',
              dynamicText: dynamicText
            }}
            title="Visible Widgets"
            items={widgetItems}
            multiSelect={multiSelect}
          />
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="text-lg font-semibold">Icon Button Dropdown</h3>
          <p className="text-sm text-muted-foreground mb-4">Single-select actions menu with icons</p>
          <UnifiedDropdown
            trigger={{
              variant: 'icon'
            }}
            items={actionItems}
            align="end"
            multiSelect={false}
            showCheckmarks={false}
            title="Actions"
          />
        </Card>
      </div>
    </div>
  )
}

export default DropdownPlayground