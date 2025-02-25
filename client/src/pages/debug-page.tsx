import { AuthDebug } from '@/components/debug/AuthDebug';
import { CookieDebug } from '@/components/debug/CookieDebug';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';

export default function DebugPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Debug Tools"
          description="Development tools to diagnose application issues"
        />
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Authentication Diagnostics</h2>
            <AuthDebug />
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-4">Cookie Management</h2>
            <CookieDebug />
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
} 