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
    <PageSideDrawer
      title={title}
      titleIcon={<Info className="h-5 w-5" />}
      isClosable={true}
      defaultOpen={defaultOpen}
    >
      <div className="space-y-4">
        {children}
      </div>
    </PageSideDrawer>
  );
}
