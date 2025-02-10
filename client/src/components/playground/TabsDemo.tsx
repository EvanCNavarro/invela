import React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { HomeIcon, FolderIcon, BarChartIcon, LockIcon } from "lucide-react"

export default function TabsDemo() {
  return (
    <div className="w-full">
      <Tabs defaultValue="tab1" className="w-full max-w-3xl">
        <TabsList className="w-full">
          <TabsTrigger value="tab1" icon={HomeIcon}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="tab2" icon={FolderIcon}>
            Documents
          </TabsTrigger>
          <TabsTrigger value="tab3" icon={BarChartIcon}>
            Analytics
          </TabsTrigger>
          <TabsTrigger value="tab4" locked>
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tab1">
          <div className="p-4 rounded-lg border mt-4">
            <h3 className="text-lg font-semibold mb-4">Company Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-medium">Total Revenue</p>
                <p className="text-2xl">$1.2M</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-medium">Active Users</p>
                <p className="text-2xl">8.5k</p>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="tab2">
          <div className="p-4 rounded-lg border mt-4">
            <h3 className="text-lg font-semibold mb-4">Recent Documents</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                <FolderIcon className="h-4 w-4" />
                <span>Q4 Financial Report.pdf</span>
              </li>
              <li className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                <FolderIcon className="h-4 w-4" />
                <span>Marketing Strategy 2025.doc</span>
              </li>
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="tab3">
          <div className="p-4 rounded-lg border mt-4">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="h-2 bg-blue-100 rounded">
                <div className="h-2 bg-blue-500 rounded" style={{ width: '75%' }}></div>
              </div>
              <div className="h-2 bg-blue-100 rounded">
                <div className="h-2 bg-blue-500 rounded" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="tab4">
          <div className="p-4 rounded-lg border mt-4">
            <p className="text-gray-500">Settings are currently locked</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}