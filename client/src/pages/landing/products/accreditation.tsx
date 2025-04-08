import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { ArrowRight, CheckCircle, Shield, Send } from 'lucide-react';
import { Link } from 'wouter';
import SectionTitleChip from '@/components/landing/SectionTitleChip';

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

export default function AccreditationPage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section id="overview" className="py-20 bg-gradient-to-b from-white to-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <SectionTitleChip title="Accreditation" sectionId="overview" className="bg-blue-100" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-bold mb-6"
              >
                Streamline FinTech Accreditation
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-gray-600 mb-10"
              >
                Invela's Accreditation platform automates the complex process of evaluating and onboarding FinTech partners, reducing time to market while ensuring compliance.
              </motion.p>
              

            </div>
            
            <div className="relative">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <div className="aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-xl relative">
                  <img 
                    src="/images/products/thumbnail_01_accreditation.png" 
                    alt="Accreditation Security Shield" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works" className="pt-10 pb-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="mb-6"
            >
              <SectionTitleChip title="How It Works" sectionId="how-it-works" className="bg-blue-100" centered />
            </motion.div>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              A seamless Accreditation process
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our platform transforms the traditionally complex and time-consuming Accreditation process into a streamlined workflow.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Invitation & Onboarding",
                description: "Invite FinTech partners through a personalized link, where they can complete a secure onboarding process."
              },
              {
                step: "2",
                title: "Data Collection & Verification",
                description: "Collect all necessary documentation and data through structured forms, with automated validation and verification."
              },
              {
                step: "3",
                title: "Risk Assessment",
                description: "Analyze submitted information against your risk framework to generate comprehensive risk scores and insights."
              }
            ].map((step, index) => (
              <motion.div 
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={fadeIn}
                className="relative p-8 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                id={`step-${index + 1}`}
              >
                <div className="absolute top-0 left-0 bg-blue-100 text-blue-800 font-bold h-10 w-10 flex items-center justify-center rounded-br-xl">
                  {step.step}
                </div>
                <div className="pl-2">
                  <h3 className="text-xl font-bold mb-4 mt-6">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="mb-6"
            >
              <SectionTitleChip title="Benefits" sectionId="benefits" className="bg-blue-100" centered />
            </motion.div>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Why choose Invela Accreditation?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our Accreditation platform offers significant advantages over traditional manual processes.
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
              "Reduce Accreditation time from months to weeks",
              "Standardize evaluation criteria across all partners",
              "Eliminate manual paperwork and documentation headaches",
              "Ensure consistent regulatory compliance",
              "Create defensible audit trails for all decisions",
              "Gain real-time visibility into the Accreditation pipeline",
              "Automatically identify potential risk factors",
              "Integrate with existing systems and workflows"
            ].map((benefit, index) => (
              <motion.div 
                key={index}
                variants={fadeIn}
                className="flex items-start p-4 bg-white rounded-lg shadow-sm"
                id={`benefit-${index + 1}`}
              >
                <Shield className="h-6 w-6 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
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
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="mb-6"
            >
              <SectionTitleChip title="Get Started" sectionId="contact" className="bg-white/80" centered />
            </motion.div>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Ready to transform your Accreditation process?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
            >
              Join leading financial institutions that have streamlined their partner Accreditation with Invela.
            </motion.p>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="flex justify-center"
            >
              <Link href="/landing/company/contact-us?type=sales-inquiry#contact-form" className="bg-white hover:bg-gray-100 text-blue-600 font-semibold px-8 py-3.5 rounded-lg transition-colors duration-200 flex items-center cursor-pointer">
                Contact Sales <Send className="ml-2 h-5 w-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}