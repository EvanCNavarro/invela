import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { ArrowRight, CheckCircle, Shield, BarChart4, Clock, Users, Lock, FileText, Send } from 'lucide-react';

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
              style={{
                display: "flex",
                alignItems: "center"
              }}
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
                    transform: "scale(1.35)",
                    marginTop: "-1rem"
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
              description="Streamlined vetting and accreditation of FinTech partners with automated workflows."
              link="/landing/products/accreditation"
            />
            
            {/* Feature 2 */}
            <FeatureCard
              icon={<BarChart4 className="h-8 w-8 text-blue-600" />}
              title="Risk Scoring"
              description="Advanced risk assessment using financial stability and compliance metrics."
              link="/landing/products/risk-scoring"
            />
            
            {/* Feature 3 */}
            <FeatureCard
              icon={<Users className="h-8 w-8 text-blue-600" />}
              title="Invela Registry"
              description="Centralized directory of verified financial service providers with risk profiles."
              link="/landing/products/registry"
            />
            
            {/* Feature 4 */}
            <FeatureCard
              icon={<Lock className="h-8 w-8 text-blue-600" />}
              title="Data Access Grants"
              description="Secure data sharing permissions with granular access controls and audit trails."
              link="/landing/products/data-access"
            />
            
            {/* Feature 5 */}
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8 text-blue-600" />}
              title="Dispute Resolution"
              description="Structured process for resolving compliance-related disputes between institutions."
              link="/landing/products/dispute-resolution"
            />
            
            {/* Feature 6 */}
            <FeatureCard
              icon={<Clock className="h-8 w-8 text-blue-600" />}
              title="Real-time Monitoring"
              description="Continuous compliance monitoring with alerts for potential risks and issues."
              link="/landing/products/monitoring"
            />
            
            {/* Feature 7 */}
            <FeatureCard
              icon={<FileText className="h-8 w-8 text-blue-600" />}
              title="Compliance Reporting"
              description="Comprehensive reporting to document and demonstrate regulatory adherence."
              link="/landing/products/reporting"
            />
            
            {/* Feature 8 - Additional Features (visually different, no button) */}
            <Link href="/landing/products">
              <motion.div 
                variants={fadeIn}
                className="group relative bg-gray-50 border border-gray-100 rounded-lg p-8 shadow-sm hover:shadow-sm transition-all duration-150 cursor-pointer h-full flex flex-col"
              >
                {/* No hover effect blur for this card as requested */}
                
                <div className="bg-gray-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-gray-200 transition-colors duration-150">
                  <div className="relative">
                    <svg className="h-7 w-7 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-700">Additional Features</h3>
                <p className="text-gray-600 mb-4">Our platform includes many more capabilities to enhance your compliance and risk management processes.</p>
                
                {/* No 'Learn More' button for this card as requested */}
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Benefits Section with Stats */}
      <section className="pt-16 pb-24 bg-blue-50/50">
        <div className="container mx-auto px-6 md:px-10 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.span 
                variants={fadeIn}
                className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-4"
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
                    <span className="text-gray-700 font-medium">{item}</span>
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
                  className="bg-white rounded-xl p-7 shadow-sm border border-gray-100 h-[160px] flex flex-col"
                >
                  <div className="text-4xl font-bold text-blue-600 mb-3">{stat.value}</div>
                  <p className="text-gray-600 leading-tight">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-12 relative overflow-hidden h-[340px] flex items-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0 z-0">
          {/* Base gradient */}
          <motion.div 
            animate={{ 
              background: [
                'linear-gradient(to right, #3b82f6, #6366f1)', 
                'linear-gradient(to right, #4f46e5, #06b6d4)',
                'linear-gradient(to right, #8b5cf6, #3b82f6)',
                'linear-gradient(to right, #2563eb, #7c3aed)',
                'linear-gradient(to right, #8b5cf6, #3b82f6)',
                'linear-gradient(to right, #4f46e5, #06b6d4)',
                'linear-gradient(to right, #3b82f6, #6366f1)'
              ]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity, 
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            className="absolute inset-0"
          ></motion.div>
          
          {/* First animated blob */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.7, 0.5],
              x: [0, 20, 0],
              y: [0, 15, 0]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            className="absolute top-1/2 -translate-y-1/2 left-1/4 w-[800px] h-[800px] rounded-full bg-purple-600/40 blur-3xl"
          ></motion.div>
          
          {/* Second animated blob */}
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.6, 0.4],
              x: [0, -25, 0],
              y: [0, -15, 0]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute top-1/3 -translate-y-1/3 right-1/4 w-[700px] h-[700px] rounded-full bg-cyan-500/40 blur-3xl"
          ></motion.div>
          
          {/* Third animated blob */}
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 15, 0],
              y: [0, -20, 0]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] rounded-full bg-sky-500/40 blur-3xl"
          ></motion.div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 py-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.h2 
              variants={fadeIn}
              className="text-4xl font-bold mb-5 text-white shadow-text"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.25)' }}
            >
              Ready to transform your
              <br />
              Compliance & Risk Management?
            </motion.h2>
            <motion.p 
              variants={fadeIn}
              className="text-xl text-blue-100 mb-6 max-w-xl mx-auto"
            >
              Join leading financial institutions that trust Invela to streamline their compliance operations and reduce risk.
            </motion.p>
            
            <motion.div 
              variants={fadeIn}
              className="flex justify-center"
            >
              <Link href="/landing/company/about">
                <a className="bg-white hover:bg-gray-100 text-blue-600 font-semibold px-8 py-3.5 rounded-lg transition-colors duration-200 hover:text-blue-700 flex items-center">
                  Contact Sales <Send className="ml-2 h-5 w-5" />
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
function FeatureCard({ icon, title, description, link }: { icon: React.ReactNode, title: string, description: string, link: string }) {
  return (
    <Link href={link}>
      <motion.div 
        variants={fadeIn}
        className="group relative bg-white border border-gray-100 rounded-lg p-8 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer h-full flex flex-col overflow-hidden"
      >
        {/* Inner bottom-left soft gradient blur - persistently rendered but initially transparent */}
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-400/20 rounded-bl-lg rounded-tr-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-150 -z-10"></div>
        
        <div className="bg-blue-50 w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors duration-150">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors duration-150">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        {/* Learn More button that appears on hover */}
        <div className="mt-auto">
          <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-150 font-semibold">
            Learn More
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1 transition-transform group-hover:translate-x-1">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Additional Features Card Component (visually different from main feature cards)
function AdditionalFeaturesCard({ icon, title, description, link }: { icon: React.ReactNode, title: string, description: string, link: string }) {
  return (
    <Link href={link}>
      <motion.div 
        variants={fadeIn}
        className="group relative bg-gray-50 border border-gray-100 rounded-lg p-8 shadow-sm hover:shadow-sm transition-all duration-300 cursor-pointer h-full flex flex-col"
      >
        <div className="bg-gray-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
          {icon}
        </div>
        <h3 className="text-lg font-medium mb-3 text-gray-700">{title}</h3>
        <p className="text-gray-500 text-sm mb-4">{description}</p>
        
        {/* Learn More button that appears on hover */}
        <div className="mt-auto">
          <div className="flex items-center text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-semibold text-sm">
            View All Products
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1 transition-transform group-hover:translate-x-1">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}