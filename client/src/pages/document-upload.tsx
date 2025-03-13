import { DocumentUploadWizard } from "@/components/documents/DocumentUploadWizard";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const DocumentUploadPage = () => {
  return (
    <DashboardLayout>
      <DocumentUploadWizard 
        onComplete={() => {
          console.log('Document upload wizard completed');
        }}
      />
    </DashboardLayout>
  );
};

export default DocumentUploadPage;
