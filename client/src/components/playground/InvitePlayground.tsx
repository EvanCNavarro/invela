import * as React from "react"
import { InviteModal } from "./InviteModal"
import { InviteButton } from "@/components/ui/invite-button"

export function InvitePlayground() {
  const [openUserModal, setOpenUserModal] = React.useState(false)
  const [openFinTechModal, setOpenFinTechModal] = React.useState(false)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invite Playground</h2>
        <p className="text-sm text-muted-foreground">
          Demonstrates two variants of the invite modal component: User and FinTech invitations.
        </p>
      </div>

      <div className="flex gap-4">
        <InviteButton
          variant="user"
          pulse={true}
          onClick={() => setOpenUserModal(true)}
        />

        <InviteButton
          variant="fintech"
          pulse={true}
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