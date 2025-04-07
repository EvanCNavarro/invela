import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { BarChart3, Shield, Send, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'wouter';

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

export default function RiskScorePage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section id="overview" className="py-20 bg-gradient-to-b from-white to-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
              >
                Invela Risk Score
              </motion.span>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-bold mb-6"
              >
                Real-time FinTech Risk Assessment
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-gray-600 mb-10"
              >
                Invela's Risk Score provides continuous monitoring of all Trust Network members, generating real-time ratings-grade risk scores that automatically update to help you make informed decisions.
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white">
                <div className="bg-gray-200 animate-pulse w-full h-full"></div>
                {/* This would be your product screenshot */}
              </div>
              {/* Decorative elements */}
              <div className="absolute -z-10 -bottom-6 -right-6 w-full h-full rounded-2xl border border-blue-200 bg-blue-50/50"></div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.span 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
            >
              How It Works
            </motion.span>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Continuous Risk Monitoring
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our Risk Score system continuously evaluates Trust Network participants with sophisticated algorithms and real-time data analysis.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Continuous Monitoring",
                description: "Advanced algorithms continuously analyze Trust Network members for suspicious activities, business changes, and compliance issues."
              },
              {
                step: "2",
                title: "Risk Analysis & Scoring",
                description: "A comprehensive ratings-grade risk score is calculated based on multiple factors including transaction patterns, fraud indicators, and compliance history."
              },
              {
                step: "3",
                title: "Automated Notifications",
                description: "All participants are immediately notified in cases of fraud, suspicious activity, or significant business changes affecting risk profiles."
              }
            ].map((step, index) => (
              <motion.div 
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={fadeIn}
                className="relative p-8 bg-white rounded-xl border border-gray-100 shadow-sm"
                id={`step-${index + 1}`}
              >
                <div className="absolute -top-5 -left-5 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-4 mt-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
          
          <div className="flex justify-center mt-12">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="relative p-8 bg-blue-50/70 rounded-xl border border-blue-100 max-w-2xl"
              id="step-4"
            >
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                4
              </div>
              <h3 className="text-xl font-semibold mb-4 mt-2 text-center">Actionable Risk Insights</h3>
              <p className="text-gray-600 text-center">
                Beyond scores, our platform provides detailed insights into risk factors, helping institutions make informed decisions about their open banking relationships and data sharing.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.span 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
            >
              Benefits
            </motion.span>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Why choose Invela Risk Score?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our Risk Score system offers significant advantages over traditional point-in-time assessments and manual monitoring processes.
            </motion.p>
          </div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {[
              "Real-time risk evaluation versus annual or quarterly assessments",
              "Immediate notification of suspicious activities or fraudulent behavior",
              "Comprehensive visibility across the entire open banking ecosystem",
              "Reduced operational burden with automated monitoring",
              "Enhanced decision-making with data-driven risk insights",
              "Standardized risk framework for consistent evaluation",
              "Proactive fraud prevention through early warning indicators",
              "Integration with Accreditation and Liability Insurance services"
            ].map((benefit, index) => (
              <motion.div 
                key={index}
                variants={fadeIn}
                className="flex items-start p-4 bg-white rounded-lg shadow-sm"
                id={`benefit-${index + 1}`}
              >
                <BarChart3 className="h-6 w-6 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-12 text-white">
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Ready to enhance your risk management?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
            >
              Join leading financial institutions that utilize Invela's Risk Score to protect their open banking relationships.
            </motion.p>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="flex justify-center"
            >
              <Link href="/landing/company/about">
                <a className="bg-white hover:bg-gray-100 text-blue-600 font-semibold px-8 py-3.5 rounded-lg transition-colors duration-200 flex items-center">
                  Contact Sales <Send className="ml-2 h-5 w-5" />
                </a>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}