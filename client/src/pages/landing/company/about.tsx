import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
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

export default function AboutPage() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section id="overview" className="py-20 bg-gradient-to-b from-white to-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <SectionTitleChip title="About Invela" sectionId="overview" className="bg-blue-100" centered />
            </motion.div>
            
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
              className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
            >
              Invela was founded with a mission to simplify complex compliance processes for financial institutions and their technology partners.
            </motion.p>
          </div>
        </div>
      </section>
      
      {/* Mission Section */}
      <section id="mission" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-xl"
            >
              <motion.div 
                variants={fadeIn}
                className="w-full h-full"
              >
                <img 
                  src="/images/company/thumbnail_00_about.png" 
                  alt="Invela Trust Network Visualization" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.div 
                variants={fadeIn}
                className="mb-6"
              >
                <SectionTitleChip title="Our Mission" sectionId="mission" className="bg-blue-100" />
              </motion.div>
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
      <section id="values" className="py-20 bg-blue-50/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="mb-6"
            >
              <SectionTitleChip title="Our Values" sectionId="values" className="bg-blue-100" centered />
            </motion.div>
            
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
                id={`value-${index + 1}`}
              >
                <h3 className="text-xl font-semibold mb-4">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Leadership Section */}
      <section id="leadership" className="pt-12 pb-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center mb-12">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
              className="mb-6"
            >
              <SectionTitleChip title="Our Leadership" sectionId="leadership" className="bg-blue-100" centered />
            </motion.div>
            
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
            
            <div className="mb-10">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
              >
                {/* First Row - 4 Leaders */}
                <motion.div variants={fadeIn} className="flex flex-col items-center" id="leader-1">
                  <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-2 border-gray-100">
                    <img src="/images/company/leadership/leadership_01_ssmith.png" alt="Steve Smith" className="w-full h-full object-cover" style={{ transform: 'scale(1.5)', objectPosition: 'center 10px' }} />
                  </div>
                  <h3 className="text-lg font-semibold">Steve Smith</h3>
                  <p className="text-gray-500">Chief Executive Officer</p>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-col items-center" id="leader-2">
                  <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-2 border-gray-100">
                    <img src="/images/company/leadership/leadership_02_ncoffing.png" alt="Nathanael Coffing" className="w-full h-full object-cover" style={{ transform: 'scale(2.2)', objectPosition: 'center 10px' }} />
                  </div>
                  <h3 className="text-lg font-semibold">Nathanael Coffing</h3>
                  <p className="text-gray-500">Chief Operations Officer</p>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-col items-center" id="leader-3">
                  <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-2 border-gray-100">
                    <img src="/images/company/leadership/leadership_03_pmcfarland.png" alt="Preston McFarland" className="w-full h-full object-cover" style={{ transform: 'scale(2.2)', objectPosition: 'center 4px' }} />
                  </div>
                  <h3 className="text-lg font-semibold">Preston McFarland</h3>
                  <p className="text-gray-500">Chief Technology Officer</p>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-col items-center" id="leader-4">
                  <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-2 border-gray-100">
                    <img src="/images/company/leadership/leadership_04_dnehrebecki.png" alt="Darek Nehrebecki" className="w-full h-full object-cover" style={{ transform: 'scale(2.15)', objectPosition: 'calc(50% - 1px) 4px' }} />
                  </div>
                  <h3 className="text-lg font-semibold">Darek Nehrebecki</h3>
                  <p className="text-gray-500">Chief Strategy Officer</p>
                </motion.div>
              </motion.div>
            </div>

            {/* Second Row - 3 Leaders (Centered) */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
            >
              <motion.div variants={fadeIn} className="flex flex-col items-center" id="leader-5">
                <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-2 border-gray-100">
                  <img src="/images/company/leadership/leadership_05_gsulbaran.png" alt="Gaby Sulbaran" className="w-full h-full object-cover" style={{ transform: 'scale(2.3)', objectPosition: 'center 4px' }} />
                </div>
                <h3 className="text-lg font-semibold">Gaby Sulbaran</h3>
                <p className="text-gray-500">Chief Payments Officer</p>
              </motion.div>

              <motion.div variants={fadeIn} className="flex flex-col items-center" id="leader-6">
                <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-2 border-gray-100">
                  <img src="/images/company/leadership/leadership_06_dkurbur.png" alt="Dev Kurbur" className="w-full h-full object-cover" style={{ transform: 'scale(2.2)', objectPosition: 'center 0px' }} />
                </div>
                <h3 className="text-lg font-semibold">Dev Kurbur</h3>
                <p className="text-gray-500">Chief Customer Officer</p>
              </motion.div>

              <motion.div variants={fadeIn} className="flex flex-col items-center" id="leader-7">
                <div className="w-36 h-36 rounded-full overflow-hidden shadow-md mb-4 border-2 border-gray-100">
                  <img src="/images/company/leadership/leadership_07_jwadsworth.png" alt="Jim Wadsworth" className="w-full h-full object-cover" style={{ transform: 'scale(2.2)', objectPosition: 'center 5px' }} />
                </div>
                <h3 className="text-lg font-semibold">Jim Wadsworth</h3>
                <p className="text-gray-500">Chief Revenue Officer – International</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}