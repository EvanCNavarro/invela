import React from 'react';
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
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      phone: '',
      inquiryType: '',
      message: '',
    },
  });

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
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions or want to learn more about Invela's products and services? We're here to help.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-10"
        >
          {/* Contact Form */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <SectionTitleChip title="Get in Touch" sectionId="contact-form" centered />
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
                
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
          <div>
            <div className="mb-6">
              <SectionTitleChip title="Contact Information" sectionId="contact-info" centered />
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-xl font-semibold mb-4">Our Office</h3>
              <p className="text-gray-600 mb-4">
                100 Technology Way<br />
                Suite 450<br />
                Denver, CO 80202
              </p>
              
              <h3 className="text-xl font-semibold mb-4 mt-6">Contact Details</h3>
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
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold mb-4">Business Hours</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span>9:00 AM - 6:00 PM ET</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span>Closed</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </LandingLayout>
  );
}