import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';

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

export default function AboutPage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
            >
              About Invela
            </motion.span>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl font-bold mb-6"
            >
              Transforming financial compliance through technology
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 mb-10"
            >
              Invela was founded with a mission to simplify complex compliance processes for financial institutions and their technology partners.
            </motion.p>
          </div>
        </div>
      </section>
      
      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="relative aspect-square rounded-2xl overflow-hidden bg-blue-100"
            >
              <motion.div 
                variants={fadeIn}
                className="w-full h-full bg-gray-200 animate-pulse"
              />
              {/* This would be an image */}
            </motion.div>
            
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
                Our Mission
              </motion.span>
              <motion.h2 
                variants={fadeIn}
                className="text-3xl font-bold mb-6"
              >
                Building trust in the financial ecosystem
              </motion.h2>
              <motion.p 
                variants={fadeIn}
                className="text-lg text-gray-600 mb-6"
              >
                We believe that financial innovation thrives when built on a foundation of trust, security, and compliance. That's why we've created a comprehensive platform that helps financial institutions and FinTechs establish and maintain secure relationships.
              </motion.p>
              <motion.p 
                variants={fadeIn}
                className="text-lg text-gray-600"
              >
                Our accreditation and risk assessment tools enable banks to work confidently with innovative partners while managing risk effectively and meeting regulatory requirements.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Values Section */}
      <section className="py-20 bg-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.span 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
            >
              Our Values
            </motion.span>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Principles that guide our work
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              At Invela, we're committed to upholding the highest standards in everything we do. Our values drive our innovation and guide our relationships with clients and partners.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Trust & Transparency",
                description: "We believe in being completely transparent with our clients and building relationships based on mutual trust."
              },
              {
                title: "Innovation",
                description: "We continuously seek new ways to simplify complex compliance processes through technology and automation."
              },
              {
                title: "Expertise",
                description: "Our team combines deep financial regulatory knowledge with technical expertise to deliver effective solutions."
              },
              {
                title: "Collaboration",
                description: "We work closely with clients to understand their unique challenges and create tailored solutions."
              },
              {
                title: "Security",
                description: "We maintain the highest standards of data security and privacy in all our operations."
              },
              {
                title: "Integrity",
                description: "We conduct our business with unwavering integrity and hold ourselves to the highest ethical standards."
              }
            ].map((value, index) => (
              <motion.div 
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={fadeIn}
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100"
              >
                <h3 className="text-xl font-semibold mb-4">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Leadership Section Placeholder */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.span 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="inline-block bg-blue-100 text-blue-600 rounded-full px-4 py-1 text-sm font-medium mb-6"
            >
              Our Leadership
            </motion.span>
            
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Meet the team behind Invela
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600 mb-10"
            >
              Our leadership team brings together decades of experience in finance, regulation, technology, and data security.
            </motion.p>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={fadeIn}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex flex-col items-center">
                  <div className="w-40 h-40 rounded-full bg-gray-200 animate-pulse mb-4" />
                  <h3 className="text-lg font-semibold">Leadership Name</h3>
                  <p className="text-blue-600">Position Title</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}