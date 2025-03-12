import React, { useState } from 'react';
import { useNavigate } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Step, Steps } from '@/components/ui/steps';
import { CheckCircle, AlertCircle, ArrowRight, ClipboardList, Building2, ShieldCheck, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCompany } from '@/hooks/useCompany';

export default function CompanyOnboardingPage() {
  const { toast } = useToast();
  const [, navigate] = useNavigate();
  const { company, isLoading: isLoadingCompany } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);

  // Fetch company onboarding status
  const { data: onboardingData, isLoading } = useQuery({
    queryKey: ['company-onboarding', company?.id],
    queryFn: async () => {
      const response = await fetch(`/api/company/${company?.id}/onboarding-status`);
      if (!response.ok) {
        throw new Error('Failed to fetch onboarding status');
      }
      return response.json();
    },
    enabled: !!company?.id,
  });

  // Mutation to complete onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/company/${company?.id}/complete-onboarding`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Onboarding Completed',
        description: 'Your company onboarding has been completed successfully.',
      });
      // Redirect to dashboard or refresh the page
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete onboarding',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || isLoadingCompany) {
    return <LoadingScreen message="Loading onboarding status..." />;
  }

  const steps = [
    {
      id: 'company-information',
      title: 'Company Information',
      description: 'Basic company details and identification',
      icon: <Building2 className="h-5 w-5" />,
      status: onboardingData?.steps?.companyInfo?.completed ? 'complete' : 'incomplete',
      action: () => navigate('/profile/company'),
    },
    {
      id: 'kyb-verification',
      title: 'KYB Verification',
      description: 'Know Your Business documentation',
      icon: <ShieldCheck className="h-5 w-5" />,
      status: onboardingData?.steps?.kyb?.completed ? 'complete' : 'incomplete',
      action: () => navigate('/task-center'),
    },
    {
      id: 'card-assessment',
      title: 'CARD Assessment',
      description: 'Complete the regulatory assessment',
      icon: <ClipboardList className="h-5 w-5" />,
      status: onboardingData?.steps?.card?.completed ? 'complete' : 'incomplete',
      action: () => navigate('/task-center'),
    },
    {
      id: 'documentation',
      title: 'Documentation',
      description: 'Review and sign required documents',
      icon: <FileText className="h-5 w-5" />,
      status: onboardingData?.steps?.documentation?.completed ? 'complete' : 'incomplete',
      action: () => navigate('/file-vault'),
    },
  ];

  const overallProgress = onboardingData?.overallProgress || 0;
  const isComplete = overallProgress === 100;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 max-w-5xl">
        <PageHeader
          title="Company Onboarding"
          description="Complete these steps to set up your company"
        />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <Steps className="mb-8" currentStep={currentStep} onChange={setCurrentStep}>
          {steps.map((step, index) => (
            <Step
              key={step.id}
              icon={step.icon}
              title={step.title}
              description={step.description}
              status={step.status}
              onClick={() => setCurrentStep(index)}
            >
              <div className="flex justify-between items-center mt-4">
                <Badge variant={step.status === 'complete' ? 'success' : 'outline'}>
                  {step.status === 'complete' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completed
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Pending
                    </>
                  )}
                </Badge>
                <Button size="sm" variant="outline" onClick={step.action}>
                  {step.status === 'complete' ? 'Review' : 'Complete'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Step>
          ))}
        </Steps>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">What happens after onboarding?</CardTitle>
            <CardDescription>Once you complete all onboarding steps, you'll gain access to:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold">Additional Platform Features</p>
                <p className="text-sm text-muted-foreground">More tools and capabilities will be unlocked</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold">Network Access</p>
                <p className="text-sm text-muted-foreground">Connect with partner companies in the platform</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold">Advanced Analytics</p>
                <p className="text-sm text-muted-foreground">Access to insights and data visualizations</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {isComplete ? (
              <Button onClick={() => completeOnboardingMutation.mutate()} disabled={completeOnboardingMutation.isPending}>
                {completeOnboardingMutation.isPending ? 'Completing...' : 'Complete Onboarding'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Complete all steps above to finish onboarding</p>
            )}
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}