import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '@/components/landing/LandingLayout';
import SectionTitleChip from '@/components/landing/SectionTitleChip';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// Form schema for contact form
const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  company: z.string().min(1, { message: 'Company name is required.' }),
  phone: z.string().optional(),
  inquiryType: z.string().min(1, { message: 'Please select an inquiry type.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactUsPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const typeParam = searchParams.get('type');
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      phone: '',
      inquiryType: typeParam === 'product-demo' ? 'product-demo' : '',
      message: '',
    },
  });
  
  // Set autofocus on component mount
  useEffect(() => {
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    if (nameInput) {
      nameInput.focus();
    }
  }, []);

  function onSubmit(data: ContactFormValues) {
    // In a real implementation, this would send the data to a server
    console.log(data);
    
    // Show success toast
    toast({
      title: "Message sent!",
      description: "We've received your inquiry and will get back to you shortly.",
    });
    
    // Reset the form
    form.reset();
  }

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] to-white">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have questions or want to learn more about Invela's products and services? We're here to help.
            </p>
          </motion.div>

          {/* Get in Touch Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-16"
          >
            <div className="max-w-2xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-10">
                <div className="mb-6 text-left">
                  <SectionTitleChip title="Get in Touch" sectionId="contact-form" centered={false} />
                  <h2 className="text-2xl font-bold mt-2 mb-6">Send Us a Message</h2>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Your company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="inquiryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inquiry Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select the type of inquiry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="product-demo">Product Demo</SelectItem>
                              <SelectItem value="sales-inquiry">Sales Inquiry</SelectItem>
                              <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="general">General Inquiry</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="How can we help you? Please provide details about your inquiry." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full">Send Message</Button>
                  </form>
                </Form>
              </div>
              
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Our Office */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-semibold mb-4">Our Office</h3>
                  <p className="text-gray-600 mb-4">
                    100 Technology Way<br />
                    Suite 450<br />
                    Denver, CO 80202
                  </p>
                </div>
                
                {/* Contact Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-semibold mb-4">Contact Details</h3>
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold">Email:</span> <a href="mailto:info@invela.com" className="text-blue-600 hover:underline">info@invela.com</a>
                  </p>
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold">Phone:</span> <a href="tel:+15551234567" className="text-blue-600 hover:underline">+1 (555) 123-4567</a>
                  </p>
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold">Support:</span> <a href="mailto:support@invela.com" className="text-blue-600 hover:underline">support@invela.com</a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}