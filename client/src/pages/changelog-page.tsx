/**
 * ========================================
 * Changelog Page
 * ========================================
 * 
 * Page component that displays the platform changelog with version history
 * and development updates. Provides navigation and responsive layout.
 * 
 * @module ChangelogPage
 * @version 1.0.0
 * @since 2025-05-30
 */

import { ChangelogViewer } from '@/components/changelog/ChangelogViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function ChangelogPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <ChangelogViewer />
      </div>
    </div>
  );
}