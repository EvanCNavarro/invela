import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Link } from 'wouter';
import { ArrowRight, FileText, ShieldCheck, Scale, BookOpen } from 'lucide-react';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function LegalPage() {
  return (
    <LandingLayout>
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h1 className="text-4xl font-bold mb-6">Legal Documentation</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Access Invela's legal documentation, policies, and compliance information to understand how we operate and protect your data.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20"
        >
          <motion.div variants={fadeIn} className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="mb-5 inline-block p-3 bg-blue-50 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Terms of Use</h2>
            <p className="text-gray-600 mb-6">
              Read our terms and conditions for using the Invela platform and services.
            </p>
            <Link href="/landing/legal/terms-of-use">
              <a className="flex items-center text-blue-600 font-medium hover:text-blue-800">
                Read Terms <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="mb-5 inline-block p-3 bg-blue-50 rounded-lg">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Privacy Policy</h2>
            <p className="text-gray-600 mb-6">
              Understand how we collect, use, and protect your personal information.
            </p>
            <Link href="/landing/legal/privacy-policy">
              <a className="flex items-center text-blue-600 font-medium hover:text-blue-800">
                Read Policy <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="mb-5 inline-block p-3 bg-blue-50 rounded-lg">
              <Scale className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Compliance Information</h2>
            <p className="text-gray-600 mb-6">
              Details about our security certifications, regulatory compliance, and industry standards.
            </p>
            <Link href="/landing/legal/compliance">
              <a className="flex items-center text-blue-600 font-medium hover:text-blue-800">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="mb-5 inline-block p-3 bg-blue-50 rounded-lg">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Site Map</h2>
            <p className="text-gray-600 mb-6">
              Complete overview of our website structure to help you navigate our resources.
            </p>
            <Link href="/landing/site-map">
              <a className="flex items-center text-blue-600 font-medium hover:text-blue-800">
                View Site Map <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-blue-50 rounded-xl p-8 md:p-12 border border-blue-100"
        >
          <h2 className="text-2xl font-semibold mb-4">Need Legal Assistance?</h2>
          <p className="text-gray-700 mb-6">
            If you have specific legal questions or require further information about our policies, please contact our legal team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="mailto:legal@invela.com" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 text-center">
              Contact Legal Team
            </a>
            <Link href="/landing">
              <a className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-6 py-3 rounded-lg transition-colors duration-200 text-center">
                Return to Homepage
              </a>
            </Link>
          </div>
        </motion.div>
      </div>
    </LandingLayout>
  );
}