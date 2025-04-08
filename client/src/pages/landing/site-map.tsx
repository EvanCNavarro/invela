import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';

// Custom component for site map links to handle both wouter Links and regular anchor tags
interface SiteMapLinkProps {
  href: string;
  label: string;
}

const SiteMapLink = ({ href, label }: SiteMapLinkProps) => {
  // If this is an anchor link (contains #) or external link, use regular <a> tag
  const isSpecialLink = href.includes('#') || href.startsWith('http');
  const isEmptyLink = href === '#';
  
  const linkContent = (
    <>
      <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
      {label}
    </>
  );
  
  if (isEmptyLink) {
    // For empty/placeholder links, use a button styled as a link
    return (
      <button className="flex items-center text-gray-700 hover:text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0 text-left">
        {linkContent}
      </button>
    );
  } else if (isSpecialLink) {
    // For anchor or external links
    return (
      <a href={href} className="flex items-center text-gray-700 hover:text-blue-600 hover:underline">
        {linkContent}
      </a>
    );
  } else {
    // For internal links, use wouter Link
    return (
      <Link href={href}>
        <div className="flex items-center text-gray-700 hover:text-blue-600 hover:underline cursor-pointer">
          {linkContent}
        </div>
      </Link>
    );
  }
};

export default function SiteMapPage() {
  return (
    <LandingLayout>
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-bold mb-4">Site Map</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive overview of the Invela website structure to help you navigate our resources.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {/* Main Pages */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Main Pages</h2>
            <ul className="space-y-4">
              <li>
                <SiteMapLink href="/landing" label="Home" />
              </li>
              <li>
                <SiteMapLink href="/login" label="Login" />
              </li>
              <li>
                <SiteMapLink href="/register" label="Register" />
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Products</h2>
            <ul className="space-y-4">
              <li>
                <SiteMapLink href="/landing/products/accreditation" label="Accreditation" />
              </li>
              <li>
                <SiteMapLink href="/landing/products/risk-score" label="Risk Score" />
              </li>
              <li>
                <SiteMapLink href="/landing/products/invela-registry" label="Invela Registry" />
              </li>
              <li>
                <SiteMapLink href="/landing/products/data-access-grants-service" label="Data Access Grants Service" />
              </li>
              <li>
                <SiteMapLink href="/landing/products/liability-insurance" label="Liability Insurance" />
              </li>
              <li>
                <SiteMapLink href="/landing/products/dispute-resolution" label="Dispute Resolution" />
              </li>
              <li>
                <SiteMapLink href="/landing/products/insights-consulting" label="Insights & Consulting" />
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Company</h2>
            <ul className="space-y-4">
              <li>
                <SiteMapLink href="/landing/company/about" label="About" />
              </li>
              <li>
                <SiteMapLink href="/landing/company/about#leadership" label="Leadership" />
              </li>
              <li>
                <SiteMapLink href="#" label="Partners" />
              </li>
              <li>
                <SiteMapLink href="/landing/company/contact-us" label="Contact Us" />
              </li>
              <li>
                <SiteMapLink href="/landing/legal" label="Legal" />
              </li>
              <li>
                <SiteMapLink href="/landing/site-map" label="Site Map" />
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Legal</h2>
            <ul className="space-y-4">
              <li>
                <SiteMapLink href="/landing/legal" label="Legal Information" />
              </li>
              <li>
                <SiteMapLink href="/landing/legal/privacy-policy" label="Privacy Policy" />
              </li>
              <li>
                <SiteMapLink href="/landing/legal/terms-of-use" label="Terms of Use" />
              </li>
              <li>
                <SiteMapLink href="/landing/legal/compliance" label="Compliance Information" />
              </li>
            </ul>
          </div>

          {/* Dashboard (When Logged In) */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Dashboard</h2>
            <ul className="space-y-4">
              <li>
                <SiteMapLink href="/dashboard" label="Dashboard Home" />
              </li>
              <li>
                <SiteMapLink href="/task-center" label="Task Center" />
              </li>
              <li>
                <SiteMapLink href="/network" label="Network" />
              </li>
              <li>
                <SiteMapLink href="/insights" label="Insights" />
              </li>
              <li>
                <SiteMapLink href="/file-vault" label="File Vault" />
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Resources</h2>
            <ul className="space-y-4">
              <li>
                <SiteMapLink href="#" label="Help Center" />
              </li>
              <li>
                <SiteMapLink href="#" label="API Documentation" />
              </li>
              <li>
                <SiteMapLink href="#" label="Support" />
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </LandingLayout>
  );
}