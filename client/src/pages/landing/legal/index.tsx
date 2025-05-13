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

// Legal Card component that makes the entire card clickable
function LegalCard({ 
  icon, 
  title, 
  description, 
  link, 
  actionText 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  link: string,
  actionText: string
}) {
  return (
    <Link href={link}>
      <motion.div 
        variants={fadeIn} 
        className="group relative bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
      >
        {/* Gradient border that appears on hover */}
        <div 
          className="absolute inset-0 rounded-xl p-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(73, 101, 236, 0.5) 0%, rgba(32, 156, 90, 0.5) 100%)',
            zIndex: 0 
          }}
        >
          <div className="absolute inset-0 bg-white rounded-xl m-[1px]"></div>
        </div>
        
        {/* Bottom right gradient blur that appears on hover */}
        <div 
          className="absolute bottom-0 right-0 w-[55%] h-[45%] bg-blue-300/10 rounded-br-lg blur-xl opacity-0 
                     group-hover:opacity-100 transition-opacity duration-300"
          style={{ zIndex: 0 }}
        />
        
        <div className="mb-5 inline-block p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors duration-150 z-10 relative">
          {icon}
        </div>
        <h2 className="text-2xl font-semibold mb-3 group-hover:text-blue-600 transition-colors duration-150 z-10 relative">{title}</h2>
        <p className="text-gray-600 mb-6 z-10 relative">
          {description}
        </p>
        <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-800 z-10 relative">
          {actionText} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </motion.div>
    </Link>
  );
}

export default function LegalPage() {
  return (
    <LandingLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] to-white">
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
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <LegalCard
              icon={<ShieldCheck className="h-8 w-8 text-blue-600" />}
              title="Privacy Policy"
              description="Understand how we collect, use, and protect your personal information."
              link="/landing/legal/privacy-policy"
              actionText="Read Policy"
            />

            <LegalCard
              icon={<FileText className="h-8 w-8 text-blue-600" />}
              title="Terms of Use"
              description="Read our terms and conditions for using the Invela platform and services."
              link="/landing/legal/terms-of-use"
              actionText="Read Terms"
            />

            <LegalCard
              icon={<Scale className="h-8 w-8 text-blue-600" />}
              title="Compliance Information"
              description="Details about our security certifications, regulatory compliance, and industry standards."
              link="/landing/legal/compliance"
              actionText="Learn More"
            />

            <LegalCard
              icon={<BookOpen className="h-8 w-8 text-blue-600" />}
              title="Site Map"
              description="Complete overview of our website structure to help you navigate our resources."
              link="/landing/site-map"
              actionText="View Site Map"
            />
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}