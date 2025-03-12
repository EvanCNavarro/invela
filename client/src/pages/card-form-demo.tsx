import { CardFormPlayground } from "@/components/playground/CardFormPlayground";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export default function CardFormDemo() {
  console.log('[CardFormDemo] Rendering demo page');
  
  return (
    <DashboardLayout>
      <div className="container max-w-7xl mx-auto py-6">
        <CardFormPlayground
          taskId={193} // Using the taskId from your logs
          companyName="DataTechCompany"
          companyData={{
            name: "DataTechCompany",
            description: "Test company for form verification"
          }}
          onSubmit={(formData) => {
            console.log('[CardFormDemo] Form submitted:', formData);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
