import { CompanySearchPlayground } from "@/components/playground/CompanySearchPlayground";

export default function PlaygroundPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Company Data Crawler</h1>
      <CompanySearchPlayground />
    </div>
  );
}