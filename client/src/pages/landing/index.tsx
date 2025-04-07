import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { ArrowRight, CheckCircle, Shield, BarChart4, Clock, Users, Lock } from 'lucide-react';

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
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-blue-50/50">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/assets/grid-pattern.svg')] bg-center opacity-5"></div>
          <div className="absolute top-1/2 -translate-y-1/2 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-200/20 blur-3xl"></div>
          <div className="absolute top-1/3 -translate-y-1/2 right-1/4 w-[300px] h-[300px] rounded-full bg-indigo-200/20 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 pt-24 pb-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="mb-4"
            >
              <span className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6">
                The Enterprise Risk Management Platform
              </span>
            </motion.div>
            
            <motion.h1 
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-500 text-transparent bg-clip-text"
            >
              Simplify Compliance and Risk Management
            </motion.h1>
            
            <motion.p 
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto"
            >
              Invela delivers an integrated platform that streamlines FinTech accreditation, 
              automates risk assessment, and provides real-time compliance monitoring for financial institutions.
            </motion.p>
            
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/login">
                <a className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-lg transition-colors duration-200 flex items-center justify-center">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Link>
              <Link href="/landing/company/about">
                <a className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-8 py-4 rounded-lg border border-gray-200 transition-colors duration-200">
                  Learn More
                </a>
              </Link>
            </motion.div>
          </div>
          
          {/* Preview Image */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mx-auto max-w-5xl"
          >
            <div className="aspect-[16/9] rounded-xl overflow-hidden border border-gray-200 shadow-xl bg-white">
              <div className="bg-gray-200 animate-pulse w-full h-full"></div>
              {/* This would be your platform screenshot */}
            </div>
            {/* Decorative elements showing the platform is hovering */}
            <div className="absolute -bottom-3 inset-x-4 h-12 bg-gradient-to-t from-blue-50 to-transparent rounded-lg blur-md"></div>
          </motion.div>
        </div>
        
        {/* Scrolling indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 1,
              delay: 1,
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: 0.5
            }}
            className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center pt-2"
          >
            <motion.div 
              animate={{ 
                y: [0, 8, 0],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop"
              }}
              className="w-1.5 h-1.5 bg-gray-600 rounded-full"
            />
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <motion.span 
              variants={fadeIn}
              className="inline-block bg-blue-50 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
            >
              Key Features
            </motion.span>
            <motion.h2 
              variants={fadeIn}
              className="text-4xl font-bold mb-6"
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
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
                <a className="bg-white text-blue-600 hover:bg-blue-50 font-medium px-8 py-4 rounded-lg transition-colors duration-200">
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
      className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="bg-blue-50 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}