import React from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';

export default function PrivacyPolicyPage() {
  return (
    <LandingLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: April 7, 2025</p>
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
              At Invela, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services. Please read this policy carefully to understand our practices regarding your personal data.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p>
              We collect several types of information from and about users of our platform, including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>
                <strong>Personal Information:</strong> Such as your name, email address, phone number, company affiliation, and job title.
              </li>
              <li>
                <strong>Business Information:</strong> Financial institution details, company structure, regulatory information, and other data relevant to our services.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you interact with our platform, including access times, features used, and other analytical data.
              </li>
              <li>
                <strong>Device Information:</strong> Information about the devices you use to access our services, including IP address, browser type, and operating system.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p>
              We use the information we collect for various purposes, including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Providing, operating, and maintaining our platform and services</li>
              <li>Improving, personalizing, and expanding our platform</li>
              <li>Understanding and analyzing how you use our platform</li>
              <li>Developing new products, services, features, and functionality</li>
              <li>Communicating with you about our services, updates, and other information</li>
              <li>Protecting against fraud, unauthorized transactions, and other illegal activities</li>
              <li>Complying with legal obligations and industry standards</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p>
              We may share your information with third parties only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>With service providers who assist us in operating our platform</li>
              <li>With business partners with your consent and as necessary to provide services</li>
              <li>With regulatory authorities when required by law</li>
              <li>In connection with a business transaction such as a merger or acquisition</li>
              <li>To protect our rights, privacy, safety, or property</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>The right to access your personal information</li>
              <li>The right to rectify inaccurate information</li>
              <li>The right to erasure of your information in certain circumstances</li>
              <li>The right to restrict or object to processing</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">7. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this policy. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4">
              <p><strong>Email:</strong> privacy@invela.com</p>
              <p><strong>Address:</strong> 350 Buck Center Dr, Salt Lake City, UT 84108</p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            </div>
          </section>
        </motion.div>
      </div>
    </LandingLayout>
  );
}