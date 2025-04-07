import React from 'react';
import { Link } from 'wouter';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export function NavigationMenu() {
  return (
    <NavigationMenuPrimitive.Root className="relative z-10 hidden md:flex justify-end">
      <NavigationMenuPrimitive.List className="flex items-center gap-4 rounded-lg bg-white/50 p-1">
        {/* Products Dropdown */}
        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger
            className="group flex select-none items-center justify-between gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none"
          >
            Products
            <ChevronDown
              className="h-4 w-4 text-gray-500 transition duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </NavigationMenuPrimitive.Trigger>
          <NavigationMenuPrimitive.Content
            className="data-[motion=from-start]:animate-enterFromLeft data-[motion=from-end]:animate-enterFromRight data-[motion=to-start]:animate-exitToLeft data-[motion=to-end]:animate-exitToRight absolute top-0 right-0 w-auto"
          >
            <div className="w-[560px] p-3 bg-white rounded-xl shadow-lg border border-gray-200/50">
              <div className="grid grid-cols-2 gap-4">
                <NavigationLink 
                  href="/landing/products/accreditation"
                  title="Accreditation"
                  description="Streamlined partner vetting with structured assessment frameworks"
                />
                <NavigationLink 
                  href="#"
                  title="Risk Score"
                  description="Real-time risk monitoring and assessment for financial partners"
                />
                <NavigationLink 
                  href="#"
                  title="Invela Registry"
                  description="Centralized directory of verified financial service providers"
                />
                <NavigationLink 
                  href="#"
                  title="Data Access Grants"
                  description="Secure management of data sharing permissions and controls"
                />
                <NavigationLink 
                  href="#"
                  title="Liability Insurance"
                  description="Specialized coverage for FinTech partnerships and data sharing"
                />
                <NavigationLink 
                  href="#"
                  title="Dispute Resolution"
                  description="Structured process for addressing compliance-related disputes"
                />
                <NavigationLink 
                  href="#"
                  title="Insights & Consulting"
                  description="Expert guidance for optimizing your compliance strategy"
                />
              </div>
            </div>
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item>

        {/* Company Dropdown */}
        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger
            className="group flex select-none items-center justify-between gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none"
          >
            Company
            <ChevronDown
              className="h-4 w-4 text-gray-500 transition duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </NavigationMenuPrimitive.Trigger>
          <NavigationMenuPrimitive.Content
            className="data-[motion=from-start]:animate-enterFromLeft data-[motion=from-end]:animate-enterFromRight data-[motion=to-start]:animate-exitToLeft data-[motion=to-end]:animate-exitToRight absolute top-0 right-0 w-auto"
          >
            <div className="w-[560px] p-3 bg-white rounded-xl shadow-lg border border-gray-200/50">
              <div className="grid grid-cols-2 gap-4">
                <NavigationLink 
                  href="/landing/company/about"
                  title="About"
                  description="Our mission to transform FinTech compliance"
                />
                <NavigationLink 
                  href="#"
                  title="Careers"
                  description="Join our team of compliance innovators"
                />
                <NavigationLink 
                  href="#"
                  title="Leadership"
                  description="Meet the team behind Invela's innovation"
                />
                <NavigationLink 
                  href="#"
                  title="Partners"
                  description="Our strategic alliances and integrations"
                />
                <NavigationLink 
                  href="/landing/legal"
                  title="Legal"
                  description="Our policies, terms, and compliance information"
                />
                <NavigationLink 
                  href="/landing/site-map"
                  title="Site Map"
                  description="Find what you're looking for on our site"
                />
              </div>
            </div>
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item>
      </NavigationMenuPrimitive.List>

      <NavigationMenuPrimitive.Viewport
        className="origin-top-center data-[state=open]:animate-scaleIn data-[state=closed]:animate-scaleOut absolute top-full mt-2 transition-all"
      />
    </NavigationMenuPrimitive.Root>
  );
}

interface NavigationLinkProps {
  href: string;
  title: string;
  description: string;
}

function NavigationLink({ href, title, description }: NavigationLinkProps) {
  return (
    <Link href={href}>
      <div className="block rounded-lg p-2 hover:bg-blue-50 transition-colors">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
      </div>
    </Link>
  );
}