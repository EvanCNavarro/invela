import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { CheckCircle, Shield, FileCheck, BadgeCheck, LockKeyhole } from 'lucide-react';

export default function CompliancePage() {
  return (
    <LandingLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl font-bold mb-4">Compliance Information</h1>
          <p className="text-gray-600">Last updated: April 8, 2025</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="prose prose-lg max-w-none"
        >
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              At Invela, we understand that compliance with financial regulations and industry standards is critical to maintaining trust in the financial services ecosystem. We are committed to maintaining the highest standards of legal, regulatory, and operational compliance in all aspects of our business.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">2. Certifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="bg-blue-50 rounded-lg p-5 flex items-start">
                <div className="mr-4 mt-1">
                  <BadgeCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">SOC 2 Type II</h3>
                  <p className="text-gray-700 text-sm">Our platform undergoes regular SOC 2 Type II audits, verifying our controls related to security, availability, processing integrity, confidentiality, and privacy.</p>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-5 flex items-start">
                <div className="mr-4 mt-1">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">ISO 27001</h3>
                  <p className="text-gray-700 text-sm">Our information security management system is certified under ISO 27001, demonstrating our commitment to information security best practices.</p>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-5 flex items-start">
                <div className="mr-4 mt-1">
                  <LockKeyhole className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">PCI DSS</h3>
                  <p className="text-gray-700 text-sm">We maintain PCI DSS compliance for securing payment card data processed through our platform.</p>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-5 flex items-start">
                <div className="mr-4 mt-1">
                  <FileCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">GDPR Compliance</h3>
                  <p className="text-gray-700 text-sm">Our platform is designed with GDPR compliance in mind, with robust data protection measures and privacy controls.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">3. Regulatory Framework</h2>
            <p>
              Invela operates within a comprehensive regulatory framework that governs financial services and technology providers. Our platform is designed to help financial institutions and FinTech companies meet their regulatory obligations while enabling innovation and collaboration.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Financial Services Regulations:</strong> We comply with relevant financial services regulations in the jurisdictions where we operate.</li>
              <li><strong>Data Protection Laws:</strong> Our platform meets requirements under GDPR, CCPA, and other applicable data protection laws.</li>
              <li><strong>Anti-Money Laundering:</strong> We implement robust KYC and AML procedures as required by financial regulations.</li>
              <li><strong>Open Banking Standards:</strong> Our systems comply with relevant open banking standards and regulations, including Section 1033 requirements.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">4. Security Measures</h2>
            <p>
              We implement comprehensive security measures to protect our platform and your data:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using industry-standard encryption protocols.</li>
              <li><strong>Access Controls:</strong> Strict access controls and multi-factor authentication are enforced across our systems.</li>
              <li><strong>Continuous Monitoring:</strong> Our systems are continuously monitored for security threats and vulnerabilities.</li>
              <li><strong>Regular Audits:</strong> We conduct regular security audits and penetration testing of our platform.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">5. Compliance Program</h2>
            <p>
              Our internal compliance program ensures that we maintain the highest standards of regulatory compliance:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Dedicated Compliance Team:</strong> Our compliance team monitors regulatory developments and ensures platform compliance.</li>
              <li><strong>Regular Assessments:</strong> We conduct regular compliance assessments to identify and address any compliance gaps.</li>
              <li><strong>Employee Training:</strong> All employees undergo regular training on compliance requirements and best practices.</li>
              <li><strong>Third-party Audits:</strong> We engage independent third-party auditors to verify our compliance with relevant standards and regulations.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">6. Vendor Management</h2>
            <p>
              We maintain a robust vendor management program to ensure that our third-party service providers meet our compliance standards:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Due Diligence:</strong> We conduct thorough due diligence on all third-party service providers.</li>
              <li><strong>Contractual Requirements:</strong> Our vendor contracts include specific compliance and security requirements.</li>
              <li><strong>Ongoing Monitoring:</strong> We regularly monitor vendor compliance with our standards and requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Information</h2>
            <p>
              If you have any questions about our compliance program or require additional compliance information, please contact us at:
            </p>
            <div className="mt-4">
              <p><strong>Email:</strong> legal@invela.com</p>
              <p><strong>Address:</strong> 350 Buck Center Dr, Salt Lake City, UT 84108</p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            </div>
          </section>
        </motion.div>
      </div>
    </LandingLayout>
  );
}