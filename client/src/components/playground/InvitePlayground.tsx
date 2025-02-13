import * as React from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InviteModal } from "./InviteModal"

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
        <Button
          onClick={() => setOpenUserModal(true)}
          className="gap-2"
          data-element="invite-user-button"
        >
          <Send className="h-4 w-4" />
          Invite a New User
        </Button>

        <Button
          onClick={() => setOpenFinTechModal(true)}
          className="gap-2"
          data-element="invite-fintech-button"
        >
          <Send className="h-4 w-4" />
          Invite a New FinTech
        </Button>
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
