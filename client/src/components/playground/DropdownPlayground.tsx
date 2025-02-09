import React from 'react'
import { UnifiedDropdown } from '@/components/ui/unified-dropdown'
import { Settings, User, Bell, Layout, Filter, FileText, MoreHorizontal } from 'lucide-react'
import { Card } from '@/components/ui/card'

export const DropdownPlayground = () => {
  const [selectedWidgets, setSelectedWidgets] = React.useState<string[]>(['announcements', 'quick_actions'])
  const [selectedFilter, setSelectedFilter] = React.useState<string>('all')
  const [selectedAction, setSelectedAction] = React.useState<string | null>(null)

  const widgetItems = [
    { id: 'updates', label: 'Updates', leftIcon: Bell },
    { id: 'announcements', label: 'Announcements', leftIcon: FileText },
    { id: 'quick_actions', label: 'Quick Actions', leftIcon: Layout },
    { id: 'company_score', label: 'Company Score' },
    { id: 'network', label: 'Network Visualization' },
  ].map(item => ({
    ...item,
    selected: selectedWidgets.includes(item.id),
    onClick: () => {
      setSelectedWidgets(prev => 
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      )
    }
  }))

  const filterItems = [
    { id: 'all', label: 'All Items' },
    { id: 'active', label: 'Active Only' },
    { id: 'archived', label: 'Archived' },
  ].map(item => ({
    ...item,
    selected: selectedFilter === item.id,
    onClick: () => setSelectedFilter(item.id)
  }))

  const actionItems = [
    { id: 'edit', label: 'Edit', leftIcon: Settings },
    { id: 'delete', label: 'Delete' },
    { id: 'archive', label: 'Archive' },
  ].map(item => ({
    ...item,
    selected: selectedAction === item.id,
    onClick: () => setSelectedAction(item.id)
  }))

  return (
    <Card className="p-4 space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Regular Button with Icon</h3>
        <p className="text-sm text-muted-foreground mb-4">Multi-select with leading icons in items</p>
        <UnifiedDropdown
          trigger={{
            text: "Customize Dashboard",
            leftIcon: Settings,
            variant: 'default'
          }}
          title="Visible Widgets"
          items={widgetItems}
          multiSelect={true}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Regular Button without Icon</h3>
        <p className="text-sm text-muted-foreground mb-4">Single-select without icons</p>
        <UnifiedDropdown
          trigger={{
            text: "Filter View",
            variant: 'default'
          }}
          items={filterItems}
          multiSelect={false}
        />
      </div>

      <div className="space-y-2">
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
      </div>
    </Card>
  )
}