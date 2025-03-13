import { useQuery } from "@tanstack/react-query";
import { DocumentUploadWizard } from "@/components/documents/DocumentUploadWizard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const DocumentUploadPage = () => {
  // Fetch current company data
  const { data: company, isLoading } = useQuery({
    queryKey: ['/api/companies/current'],
    retry: false
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground">
              Could not load company information. Please try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DocumentUploadWizard 
        companyName={company.name}
        onComplete={() => {
          console.log('Document upload wizard completed');
        }}
      />
    </DashboardLayout>
  );
};

export default DocumentUploadPage;