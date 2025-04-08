import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { LandingLayout } from '@/components/landing/LandingLayout';
import SectionTitleChip from '@/components/landing/SectionTitleChip';
import { Send, CheckCircle } from 'lucide-react';

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
      staggerChildren: 0.15
    }
  }
};

export default function DataAccessPage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <SectionTitleChip title="Data Access Grants Service" sectionId="overview" className="bg-blue-100" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-bold mb-6"
              >
                Simplified Open Banking Data Access
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-gray-600 mb-10"
              >
                Our comprehensive data access management platform simplifies the complexities of consent management, authorization, and audit for financial institutions and FinTechs.
              </motion.p>
              

            </div>
            
            <div className="relative">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-xl relative">
                  <img 
                    src="/images/products/thumbnail_04_data-access-grants-service.png" 
                    alt="Data Access Grants Service Interface" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="pt-10 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="mb-6"
            >
              <SectionTitleChip title="How It Works" sectionId="features" className="bg-blue-100" centered />
            </motion.div>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Seamless Data Access Management
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our Data Access Grants Service provides a comprehensive solution for managing the entire lifecycle of data access permissions within the open banking ecosystem.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Consent Management",
                description: "Create, manage, and revoke data access consents with an intuitive interface that ensures regulatory compliance and user transparency."
              },
              {
                step: "2",
                title: "Token Administration",
                description: "Securely manage access tokens with automated lifecycle handling, including issuance, validation, and expiration management."
              },
              {
                step: "3",
                title: "Comprehensive Audit Trail",
                description: "Maintain a complete and immutable record of all data access events for compliance reporting and security monitoring."
              }
            ].map((feature, index) => (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: { duration: 0.5, delay: index * 0.2 }
                  }
                }}
                key={index}
                className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 bg-blue-100 text-blue-800 font-bold h-10 w-10 flex items-center justify-center rounded-br-xl">
                  {feature.step}
                </div>
                <div className="pl-2">
                  <h3 className="text-xl font-bold mb-4 mt-6">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
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
              Why choose Invela Data Access Grants Service?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our Data Access Grants Service offers significant advantages over in-house solutions or basic access management systems.
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
              "Reduce implementation time from months to weeks",
              "Ensure compliance with all open banking regulations",
              "Minimize security risks with standardized protocols",
              "Improve user experience with streamlined consent flows",
              "Integration with the broader Trust Network ecosystem",
              "Scale effortlessly as your data sharing volume grows",
              "Simplified integration with existing systems via APIs",
              "Reduced operational overhead with SaaS delivery model"
            ].map((benefit, index) => (
              <motion.div 
                key={index}
                variants={fadeIn}
                className="flex items-start p-4 bg-white rounded-lg shadow-sm"
              >
                <CheckCircle className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-gray-700">{benefit}</p>
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
              Ready to simplify Data Access Management?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
            >
              Join leading financial institutions and FinTechs that use Invela's Data Access Grants Service to streamline their open banking operations.
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