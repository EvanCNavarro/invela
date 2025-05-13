import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { LandingLayout } from '@/components/landing/LandingLayout';
import SectionTitleChip from '@/components/landing/SectionTitleChip';
import { ArrowRight, CheckCircle, Shield, BarChart4, Clock, Users, Lock, FileText, Send, ShieldCheck, LineChart } from 'lucide-react';

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
      <section id="overview" className="relative overflow-hidden">
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
                className="mb-6"
              >
                <SectionTitleChip title="The Enterprise Risk Management Platform" sectionId="overview" className="bg-white/80 shadow-sm" />
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
                <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center w-full sm:w-[180px] text-center hover:text-white">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link href="/landing/company/about" className="bg-white hover:bg-gray-50 text-gray-800 font-medium px-8 py-3 rounded-lg border border-gray-200 transition-colors duration-200 w-full sm:w-[180px] text-center flex items-center justify-center">
                  Learn More
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
      <section id="features" className="pt-16 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="max-w-3xl mb-12 mx-auto text-center"
          >
            <motion.div variants={fadeIn}>
              <SectionTitleChip title="Key Features" sectionId="features" className="mb-4" centered />
            </motion.div>
            <motion.h2 
              variants={fadeIn}
              className="text-4xl font-bold mb-4 mx-auto"
            >
              Everything you need <br className="hidden sm:block" />
              for FinTech compliance
            </motion.h2>
            <motion.p 
              variants={fadeIn}
              className="text-lg text-gray-600 mx-auto"
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
              title="Risk Score"
              description="Advanced risk assessment using financial stability and compliance metrics."
              link="/landing/products/risk-score"
            />
            
            {/* Feature 3 */}
            <FeatureCard
              icon={<Users className="h-8 w-8 text-blue-600" />}
              title="Invela Registry"
              description="Centralized directory of verified financial service providers with risk profiles."
              link="/landing/products/invela-registry"
            />
            
            {/* Feature 4 */}
            <FeatureCard
              icon={<Lock className="h-8 w-8 text-blue-600" />}
              title="Data Access Grants Service"
              description="Secure data sharing permissions with granular access controls and audit trails."
              link="/landing/products/data-access-grants-service"
            />
            
            {/* Feature 5 */}
            <FeatureCard
              icon={<ShieldCheck className="h-8 w-8 text-blue-600" />}
              title="Liability Insurance"
              description="Specialized coverage for financial institutions and FinTechs to mitigate compliance risks."
              link="/landing/products/liability-insurance"
            />
            
            {/* Feature 6 */}
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8 text-blue-600" />}
              title="Dispute Resolution"
              description="Structured process for resolving compliance-related disputes between institutions."
              link="/landing/products/dispute-resolution"
            />
            
            {/* Feature 7 */}
            <FeatureCard
              icon={<LineChart className="h-8 w-8 text-blue-600" />}
              title="Insights & Consulting"
              description="Expert advisory services and data-driven insights for regulatory compliance."
              link="/landing/products/insights-consulting"
            />
            
            {/* Feature 8 - Additional Features (no hover effects or click options) */}
            <motion.div 
              variants={fadeIn}
              className="relative bg-gray-50 border border-gray-100 rounded-lg p-8 shadow-sm h-full flex flex-col"
            >
              <div className="bg-gray-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                <div className="relative">
                  <svg className="h-7 w-7 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-700">Additional Features</h3>
              <p className="text-gray-600 mb-4">Our platform includes many more capabilities to enhance your compliance and risk management processes.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Benefits Section with Stats */}
      <section id="benefits" className="pt-16 pb-24 bg-blue-50/50">
        <div className="container mx-auto px-6 md:px-10 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeIn}>
                <SectionTitleChip title="Business Impact" sectionId="benefits" className="mb-4" />
              </motion.div>
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
      <section id="contact" className="py-0 relative overflow-hidden h-[380px] flex items-center">
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
        
        <div className="container mx-auto px-4 text-center relative z-10 h-full flex items-center justify-center">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto flex flex-col justify-between"
          >
            <motion.div variants={fadeIn} className="mb-6">
              <SectionTitleChip title="Get Started" sectionId="contact" className="bg-white/90" centered />
            </motion.div>
            <motion.h2 
              variants={fadeIn}
              className="text-4xl font-bold mb-6 text-white shadow-text"
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
              className="flex justify-center mb-6"
            >
              <Link href="/landing/company/contact-us?type=sales-inquiry#contact-form" className="bg-white hover:bg-gray-100 text-blue-600 font-semibold px-8 py-3.5 rounded-lg transition-colors duration-200 flex items-center">
                Contact Sales <Send className="ml-2 h-5 w-5" />
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
    <Link href={link} className="block">
      <motion.div 
        variants={fadeIn}
        className="group relative bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden"
      >
        {/* Gradient border that appears on hover */}
        <div 
          className="absolute inset-0 rounded-lg p-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(73, 101, 236, 0.5) 0%, rgba(32, 156, 90, 0.5) 100%)',
            zIndex: 0 
          }}
        >
          <div className="absolute inset-0 bg-white rounded-lg m-[1px]"></div>
        </div>
        
        {/* Bottom right gradient blur that appears on hover */}
        <div 
          className="absolute bottom-0 right-0 w-[55%] h-[45%] bg-blue-300/10 rounded-br-lg blur-xl opacity-0 
                     group-hover:opacity-100 transition-opacity duration-300"
          style={{ zIndex: 0 }}
        />
        
        <div className="bg-blue-50 w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors duration-150 z-10">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors duration-150 z-10">{title}</h3>
        <p className="text-gray-600 mb-4 z-10">{description}</p>
        
        {/* Learn More button that appears on hover */}
        <div className="mt-auto z-10">
          <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150 font-semibold">
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

