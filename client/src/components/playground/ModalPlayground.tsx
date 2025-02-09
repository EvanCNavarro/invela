import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InviteFinTechModal } from "@/components/dashboard/InviteFinTechModal";

export const ModalPlayground = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBorder, setShowBorder] = useState(true);
  const [showIcons, setShowIcons] = useState(true);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-border" 
            checked={showBorder} 
            onCheckedChange={setShowBorder}
          />
          <Label htmlFor="show-border">Show Border</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-icons" 
            checked={showIcons} 
            onCheckedChange={setShowIcons}
          />
          <Label htmlFor="show-icons">Show Icons</Label>
        </div>
      </div>

      {/* Modal Examples */}
      <div className="grid grid-cols-2 gap-8">
        <Card className="p-4 space-y-2">
          <h3 className="text-lg font-semibold">Invite FinTech Modal</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Form modal with validation and success feedback
          </p>
          <Button 
            onClick={() => setIsModalOpen(true)}
            variant="default"
          >
            Open Modal
          </Button>

          <InviteFinTechModal 
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            showBorder={showBorder}
            showIcons={showIcons}
          />
        </Card>
      </div>
    </div>
  );
}
