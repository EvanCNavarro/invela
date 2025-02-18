import * as React from "react"
import { Info } from "lucide-react"
import { PageSideDrawer } from "@/components/playground/PageSideDrawerPlayground"

interface BuilderPageDrawerProps {
  title?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export function BuilderPageDrawer({ 
  title = "Configuration",
  children,
  defaultOpen = true 
}: BuilderPageDrawerProps) {
  return (
    <div className="fixed right-0 top-[57px] bottom-0 w-[25.75rem]">
      <div className="h-[calc(100%-3rem)] p-8 pt-6">
        <div className="h-full rounded-lg border bg-background shadow-sm">
          <PageSideDrawer
            title={title}
            titleIcon={<Info className="h-5 w-5" />}
            isClosable={true}
            defaultOpen={defaultOpen}
            width="100%"
          >
            <div className="space-y-4">
              {children}
            </div>
          </PageSideDrawer>
        </div>
      </div>
    </div>
  );
}