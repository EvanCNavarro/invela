import * as React from "react"
import { InviteModal } from "./InviteModal"
import { InviteButton } from "@/components/ui/invite-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const InvitePlayground = () => {
  const [openUserModal, setOpenUserModal] = React.useState(false)
  const [openFinTechModal, setOpenFinTechModal] = React.useState(false)
  const [pulseEnabled, setPulseEnabled] = React.useState(true)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invite Playground</h2>
        <p className="text-sm text-muted-foreground">
          Demonstrates two variants of the invite modal component: User and FinTech invitations.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="pulse-toggle"
          checked={pulseEnabled}
          onCheckedChange={(checked) => setPulseEnabled(checked as boolean)}
        />
        <Label htmlFor="pulse-toggle">Enable pulse animation</Label>
      </div>

      <div className="flex gap-4">
        <InviteButton
          variant="user"
          pulse={pulseEnabled}
          onClick={() => setOpenUserModal(true)}
        />

        <InviteButton
          variant="fintech"
          pulse={pulseEnabled}
          onClick={() => setOpenFinTechModal(true)}
        />
      </div>

      <InviteModal
        variant="user"
        open={openUserModal}
        onOpenChange={setOpenUserModal}
        companyId={0}
        companyName="Invela"
      />

      <InviteModal
        variant="fintech"
        open={openFinTechModal}
        onOpenChange={setOpenFinTechModal}
      />
    </div>
  )
}

export default InvitePlayground