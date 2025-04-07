import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { ArrowRight, CheckCircle, Shield, BarChart4, Clock, Users, Lock, FileText } from 'lucide-react';

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

export default function LandingPage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-50 to-green-100 opacity-70"></div>
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            className="absolute top-1/2 -translate-y-1/2 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-300/20 blur-3xl"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.7, 0.5],
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute top-1/3 -translate-y-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-green-300/20 blur-3xl"
          ></motion.div>
        </div>
        
        <div className="container mx-auto px-4 pt-16 pb-20 relative z-10">
          <div className="flex flex-col lg:flex-row items-center max-w-7xl mx-auto">
            {/* Text Content */}
            <div className="w-full lg:w-1/2 text-center lg:text-left lg:pr-8 mb-10 lg:mb-0">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="mb-4"
              >
                <span className="inline-block bg-white/80 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6 shadow-sm">
                  The Enterprise Risk Management Platform
                </span>
              </motion.div>
              
              <motion.h1 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-black"
              >
                Simplify Compliance & Risk Management
              </motion.h1>
              
              <motion.p 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="text-lg text-gray-800 mb-10 max-w-xl mx-auto lg:mx-0"
              >
                Invela delivers an integrated platform that streamlines FinTech accreditation, 
                automates risk assessment, and provides real-time compliance monitoring for financial institutions.
              </motion.p>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link href="/login">
                  <a className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center w-full sm:w-[180px] text-center hover:text-white">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Link>
                <Link href="/landing/company/about">
                  <a className="bg-white hover:bg-gray-50 text-gray-800 font-medium px-8 py-3 rounded-lg border border-gray-200 transition-colors duration-200 w-full sm:w-[180px] text-center flex items-center justify-center">
                    Learn More
                  </a>
                </Link>
              </motion.div>
            </div>
            
            {/* Dashboard Image */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="w-full lg:w-3/5 relative lg:-right-12 flex justify-center lg:justify-end"
            >
              <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                  className="rounded-xl overflow-hidden shadow-2xl relative"
                  style={{ 
                    background: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    padding: "1rem",
                    transform: "scale(1.2)"
                  }}
                >
                  <img 
                    src="/ui_dashboard.svg" 
                    alt="Invela Dashboard" 
                    className="w-full h-auto rounded-lg shadow-inner"
                  />
                </motion.div>
                
                {/* Decorative elements */}
                <div className="absolute -bottom-3 inset-x-4 h-8 bg-gradient-to-t from-blue-50 to-transparent rounded-lg blur-md"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <motion.span 
              variants={fadeIn}
              className="inline-block bg-blue-50 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-4"
            >
              Key Features
            </motion.span>
            <motion.h2 
              variants={fadeIn}
              className="text-4xl font-bold mb-4"
            >
              Everything you need for FinTech compliance
            </motion.h2>
            <motion.p 
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our comprehensive suite of tools helps you manage the entire compliance lifecycle from accreditation to ongoing monitoring.
            </motion.p>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {/* Feature 1 */}
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-blue-600" />}
              title="Accreditation"
              description="Streamlined process for vetting and accrediting FinTech partners with automated workflows and document management."
            />
            
            {/* Feature 2 */}
            <FeatureCard
              icon={<BarChart4 className="h-8 w-8 text-blue-600" />}
              title="Risk Scoring"
              description="Sophisticated risk assessment algorithms to evaluate partners based on their financial stability, security practices, and compliance history."
            />
            
            {/* Feature 3 */}
            <FeatureCard
              icon={<Users className="h-8 w-8 text-blue-600" />}
              title="Invela Registry"
              description="Centralized directory of verified financial service providers with comprehensive profiles and risk scores."
            />
            
            {/* Feature 4 */}
            <FeatureCard
              icon={<Lock className="h-8 w-8 text-blue-600" />}
              title="Data Access Grants"
              description="Secure management of data sharing permissions with granular access controls and audit trails."
            />
            
            {/* Feature 5 */}
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8 text-blue-600" />}
              title="Dispute Resolution"
              description="Structured process for addressing and resolving compliance-related disputes between financial institutions and service providers."
            />
            
            {/* Feature 6 */}
            <FeatureCard
              icon={<Clock className="h-8 w-8 text-blue-600" />}
              title="Real-time Monitoring"
              description="Continuous compliance monitoring with alerts for potential risks or compliance issues as they arise."
            />
            
            {/* Feature 7 */}
            <FeatureCard
              icon={<FileText className="h-8 w-8 text-blue-600" />}
              title="Compliance Reporting"
              description="Comprehensive reporting tools to document compliance activities, track progress, and demonstrate regulatory adherence."
            />
            
            {/* Feature 8 - Coming Soon */}
            <FeatureCard
              icon={<div className="relative">
                <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              </div>}
              title="More Coming Soon"
              description="We're continuously expanding our platform with innovative features to enhance your compliance and risk management capabilities."
            />
          </motion.div>
        </div>
      </section>
      
      {/* Benefits Section with Stats */}
      <section className="py-24 bg-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.span 
                variants={fadeIn}
                className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
              >
                Business Impact
              </motion.span>
              <motion.h2 
                variants={fadeIn}
                className="text-4xl font-bold mb-6"
              >
                Transform your compliance operations
              </motion.h2>
              <motion.p 
                variants={fadeIn}
                className="text-lg text-gray-600 mb-8"
              >
                Financial institutions using Invela report significant improvements in compliance efficiency, risk management, and partner onboarding speed.
              </motion.p>
              
              <motion.ul 
                variants={staggerContainer}
                className="space-y-4"
              >
                {[
                  "Reduce compliance review time by up to 60%",
                  "Decrease risk-related incidents by 75%",
                  "Accelerate partner onboarding from months to weeks",
                  "Gain real-time visibility into your compliance ecosystem",
                  "Improve data security and access management"
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    variants={fadeIn}
                    className="flex items-start"
                  >
                    <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="grid grid-cols-2 gap-6"
            >
              {[
                { value: "60%", label: "Reduction in compliance review time" },
                { value: "80%", label: "More efficient than manual processes" },
                { value: "90%", label: "Clients reporting improved insights" },
                { value: "3x", label: "Faster partner onboarding process" }
              ].map((stat, index) => (
                <motion.div 
                  key={index}
                  variants={fadeIn}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
                  <p className="text-gray-600">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.h2 
              variants={fadeIn}
              className="text-4xl font-bold mb-6"
            >
              Ready to transform your compliance management?
            </motion.h2>
            <motion.p 
              variants={fadeIn}
              className="text-xl text-blue-100 mb-10"
            >
              Join leading financial institutions that trust Invela to streamline their compliance operations and reduce risk.
            </motion.p>
            
            <motion.div 
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/login">
                <a className="bg-white text-blue-600 hover:bg-gray-100 font-medium px-8 py-4 rounded-lg transition-colors duration-200 hover:text-blue-600">
                  Get Started Now
                </a>
              </Link>
              <Link href="/landing/company/about">
                <a className="bg-transparent hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-lg border border-white/30 transition-colors duration-200">
                  Contact Sales
                </a>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </LandingLayout>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      variants={fadeIn}
      className="group relative bg-white border border-gray-100 rounded-lg p-8 shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Colored blur background that appears on hover behind the card */}
      <div className="absolute -inset-4 bg-blue-400/30 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-blue-400/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
      
      <div className="bg-blue-50 w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}