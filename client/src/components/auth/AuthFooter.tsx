import React from 'react';

export function AuthFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-8 py-4 mb-8 text-center text-xs text-muted-foreground">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-6">
          <span>© {currentYear} Invela. All rights reserved.</span>
          <span className="text-muted-foreground">
            Privacy Policy
          </span>
          <span className="text-muted-foreground">
            Terms of Use
          </span>
          <span className="text-muted-foreground">
            Compliance Information
          </span>
          <span className="text-muted-foreground">
            Legal
          </span>
          <span className="text-muted-foreground">
            Site Map
          </span>
        </div>
      </div>
    </footer>
  );
}