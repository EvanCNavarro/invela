import React from 'react'
import { UnifiedDropdown } from '@/components/ui/unified-dropdown'
import { Settings, User, Bell, Layout, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'

export const DropdownPlayground = () => {
  const [selectedWidgets, setSelectedWidgets] = React.useState<string[]>(['announcements', 'quick_actions'])

  const widgetItems = [
    { id: 'updates', label: 'Updates' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'quick_actions', label: 'Quick Actions' },
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

  return (
    <Card className="p-4 space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Customize Dashboard Dropdown</h3>
        <UnifiedDropdown
          trigger={{
            text: "Customize Dashboard",
            leftIcon: Settings
          }}
          title="Visible Widgets"
          items={widgetItems}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">User Profile Dropdown</h3>
        <UnifiedDropdown
          trigger={{
            text: "John Doe",
            leftIcon: User,
            className: "bg-primary text-primary-foreground hover:bg-primary/90"
          }}
          items={[
            { id: 'profile', label: 'View Profile', leftIcon: User },
            { id: 'notifications', label: 'Notifications', leftIcon: Bell },
            { id: 'settings', label: 'Settings', leftIcon: Settings }
          ]}
          align="end"
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Table Filter Dropdown</h3>
        <UnifiedDropdown
          trigger={{
            text: "Filter View",
            leftIcon: Filter,
            variant: 'outline'
          }}
          items={[
            { id: 'all', label: 'All Items', selected: true },
            { id: 'active', label: 'Active Only' },
            { id: 'archived', label: 'Archived' },
          ]}
        />
      </div>
    </Card>
  )
}
