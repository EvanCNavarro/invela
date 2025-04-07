import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { LineChart, Send, BarChart, PieChart, TrendingUp, Lightbulb } from 'lucide-react';
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

export default function InsightsConsultingPage() {
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
                <SectionTitleChip title="Insights & Consulting" sectionId="overview" className="bg-blue-100" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-bold mb-6"
              >
                Data-Driven Ecosystem Intelligence
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-gray-600 mb-10"
              >
                Invela's Insights & Consulting services transform Trust Network activity data into valuable benchmarks and actionable intelligence, supported by expert advisory to help ecosystem participants optimize their operations and strategy.
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
      <section id="features" className="py-20 bg-white">
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
              Transforming Network Data Into Strategic Insight
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our Insights & Consulting services leverage the rich data from across the Trust Network to provide unparalleled visibility into the open banking ecosystem.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Data Collection & Analysis",
                description: "Aggregate anonymized activity data from across the Trust Network to identify patterns, trends, and benchmarks relevant to your business."
              },
              {
                step: "2",
                title: "Benchmark Development",
                description: "Create industry-specific performance metrics and benchmarks on fraud, operational efficiency, and risk management best practices."
              },
              {
                step: "3",
                title: "Actionable Reporting",
                description: "Transform complex data into clear, actionable insights through customized dashboards and reports tailored to your specific needs."
              }
            ].map((step, index) => (
              <motion.div 
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={fadeIn}
                className="relative p-8 bg-white rounded-xl border border-gray-100 shadow-sm"
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
            >
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                4
              </div>
              <h3 className="text-xl font-semibold mb-4 mt-2 text-center">Expert Advisory Services</h3>
              <p className="text-gray-600 text-center">
                Complement data insights with expert consultation from our team of open banking specialists to develop and implement strategic improvements to your operations.
              </p>
            </motion.div>
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
              Why choose Invela Insights & Consulting?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-lg text-gray-600"
            >
              Our Insights & Consulting services offer unique advantages that empower data-driven decision making and operational excellence.
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
              "Unparalleled visibility into industry-wide performance metrics",
              "Data-driven insights from the largest open banking dataset",
              "Expert interpretation and recommendations from specialists",
              "Real-time fraud and risk pattern detection",
              "Competitive benchmarking against industry leaders",
              "Trend identification for strategic planning",
              "Regulatory compliance optimization strategies",
              "Ongoing operational efficiency improvement"
            ].map((benefit, index) => (
              <motion.div 
                key={index}
                variants={fadeIn}
                className="flex items-start p-4 bg-white rounded-lg shadow-sm"
              >
                <LineChart className="h-6 w-6 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section id="get-started" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="mb-6"
            >
              <SectionTitleChip title="Get Started" sectionId="get-started" className="bg-blue-100" centered />
            </motion.div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-12 text-white">
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-3xl font-bold mb-6"
            >
              Ready to transform data into strategic advantage?
            </motion.h2>
            
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
            >
              Join leading financial institutions and FinTechs that leverage Invela's Insights & Consulting services to optimize their open banking operations.
            </motion.p>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="flex justify-center"
            >
              <Link href="/landing#contact-us">
                <div className="bg-white hover:bg-gray-100 text-blue-600 font-semibold px-8 py-3.5 rounded-lg transition-colors duration-200 flex items-center cursor-pointer">
                  Contact Sales <Send className="ml-2 h-5 w-5" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}