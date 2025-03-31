import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Trophy } from "lucide-react";

interface KYBSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function KYBSuccessModal({ open, onOpenChange, companyName }: KYBSuccessModalProps) {
  const [, navigate] = useLocation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Success! 🎉
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-6 text-center space-y-4">
          <p className="text-base">
            You successfully submitted the KYB Survey on behalf of <span className="font-semibold">{companyName}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            🔓 <span className="font-medium">Achievement Unlocked:</span> You've gained access to the File Vault! All files created on the Invela platform can now be found in the File Vault tab.
          </p>
        </div>
        <div className="flex justify-between gap-4 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              navigate('/task-center');
              onOpenChange(false);
            }}
          >
            Back to Task Center
          </Button>
          <Button
            onClick={() => {
              navigate('/file-vault');
              onOpenChange(false);
            }}
          >
            Go to File Vault
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}