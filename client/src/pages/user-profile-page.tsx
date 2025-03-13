
import React from 'react';
import { PageTemplate } from '@/components/ui/page-side-drawer';

export default function UserProfile() {
  return (
    <PageTemplate title="User Profile" description="Manage your profile information">
      <div className="space-y-6">
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4">Personal Information</h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-muted-foreground">John Doe</p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-muted-foreground">john.doe@example.com</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <p className="text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4">Account Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Time Zone</label>
              <p className="text-muted-foreground">UTC-05:00 Eastern Time (US & Canada)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Language</label>
              <p className="text-muted-foreground">English (US)</p>
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
