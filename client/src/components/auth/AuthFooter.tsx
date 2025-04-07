import React from 'react';
import { Link } from 'wouter';

export function AuthFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-8 py-4 text-center text-xs text-muted-foreground">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-6">
          <span>© {currentYear} Invela. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-primary hover:underline">
            Terms of Use
          </Link>
          <Link href="/legal" className="hover:text-primary hover:underline">
            Legal
          </Link>
          <Link href="/sitemap" className="hover:text-primary hover:underline">
            Site Map
          </Link>
        </div>
      </div>
    </footer>
  );
}