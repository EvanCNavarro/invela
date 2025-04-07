import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';

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
                <Link href="/landing">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Home
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/login">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Login
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/register">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Register
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Products</h2>
            <ul className="space-y-4">
              <li>
                <Link href="/landing/products/accreditation">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Accreditation
                  </a>
                </Link>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Risk Score
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Invela Registry
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Data Access Grants
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Liability Insurance
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Dispute Resolution
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Insights & Consulting
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Company</h2>
            <ul className="space-y-4">
              <li>
                <Link href="/landing/company/about">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    About
                  </a>
                </Link>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Team
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Careers
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Legal</h2>
            <ul className="space-y-4">
              <li>
                <Link href="/landing/legal">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Legal Information
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/landing/legal/privacy-policy">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Privacy Policy
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/landing/legal/terms-of-use">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Terms of Use
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Dashboard (When Logged In) */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Dashboard</h2>
            <ul className="space-y-4">
              <li>
                <Link href="/dashboard">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Dashboard Home
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/task-center">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Task Center
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/network">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Network
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/insights">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    Insights
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/file-vault">
                  <a className="flex items-center text-gray-700 hover:text-blue-600">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                    File Vault
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Resources</h2>
            <ul className="space-y-4">
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  API Documentation
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                  <ChevronRight className="h-4 w-4 mr-2 text-blue-500" />
                  Support
                </a>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </LandingLayout>
  );
}