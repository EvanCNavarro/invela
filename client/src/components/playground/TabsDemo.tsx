import React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function TabsDemo() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Tabs Component Demo</h2>
      
      <Tabs defaultValue="tab1" className="w-full max-w-3xl">
        <TabsList className="grid w-full grid-cols-4 gap-4">
          <TabsTrigger value="tab1">
            ActiveTab
          </TabsTrigger>
          <TabsTrigger value="tab2">
            DefaultTab
          </TabsTrigger>
          <TabsTrigger value="tab3">
            HoverTab
          </TabsTrigger>
          <TabsTrigger value="tab4" locked>
            LockedTab
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tab1">
          <div className="p-4 rounded-lg border mt-4">
            Content for Active Tab
          </div>
        </TabsContent>
        <TabsContent value="tab2">
          <div className="p-4 rounded-lg border mt-4">
            Content for Default Tab
          </div>
        </TabsContent>
        <TabsContent value="tab3">
          <div className="p-4 rounded-lg border mt-4">
            Content for Hover Tab
          </div>
        </TabsContent>
        <TabsContent value="tab4">
          <div className="p-4 rounded-lg border mt-4">
            Content for Locked Tab (Not accessible)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
